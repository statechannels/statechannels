#!/usr/bin/env node

import {Participant} from '@statechannels/client-api-schema';
import yargs from 'yargs';
import Table from 'cli-table3';
import createTimer, {Timer} from 'unitimer';

import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {truncate} from '../src/db-admin/db-admin-connection';
import knexPayer from '../src/db/connection';
import {
  knexReceiver,
  waitForServerToStart,
  killServer,
  ReceiverServer,
  startReceiverServer,
} from '../e2e-test/e2e-utils';

import PayerClient from './payer/client';

async function seedTestChannels(
  payer: Participant,
  payerPrivateKey: string,
  receiver: Participant,
  receiverPrivateKey: string,
  numOfChannels: number
): Promise<string[]> {
  const channelIds: string[] = [];
  for (let i = 0; i < numOfChannels; i++) {
    const seed = withSupportedState(
      {turnNum: 3},
      {
        channelNonce: i,
        participants: [payer, receiver],
      },
      [
        SigningWallet.fromJson({privateKey: payerPrivateKey}),
        SigningWallet.fromJson({privateKey: receiverPrivateKey}),
      ]
    )();
    await Channel.bindKnex(knexPayer)
      .query()
      .insert([{...seed, signingAddress: payer.signingAddress}]); // Fixture uses alice() default
    await Channel.bindKnex(knexReceiver)
      .query()
      .insert([{...seed, signingAddress: receiver.signingAddress}]);
    channelIds.push(seed.channelId);
  }
  return channelIds;
}

(async function(): Promise<void> {
  const {numChannels, numPayments} = yargs
    .command('stress-test', 'Performs a a basic stress test')
    .example(
      'stress-test --numChannels 20 --numPayments 5',
      'Runs the stress test using 20 channels calling makePayment 5 times on each channel'
    )
    .options({
      numChannels: {type: 'number'},
      numPayments: {type: 'number'},
    })
    .default({numPayments: 1, numChannels: 100}).argv;

  process.on('exit', async () => {
    if (receiverServer) {
      // TODO: Determine why killServer doesn't work node script
      receiverServer.server.kill();
      await killServer(receiverServer);
    }
  });
  let receiverServer: ReceiverServer | undefined = undefined;
  try {
    receiverServer = startReceiverServer();
    await waitForServerToStart(receiverServer);

    // Adds Alice to Payer's Database
    await truncate(knexPayer);

    await SigningWallet.query(knexPayer).insert(alice());

    // Adds Bob to Receiver's Database
    await truncate(knexReceiver);
    await SigningWallet.bindKnex(knexReceiver)
      .query()
      .insert(bob());

    const payerClient = new PayerClient(alice().privateKey, `http://127.0.0.1:65535`);

    console.log('seeding channels');
    const channelIds = await seedTestChannels(
      payerClient.me,
      alice().privateKey,
      await payerClient.getReceiversParticipantInfo(),
      bob().privateKey,
      numChannels
    );

    const fullTimer = createTimer('full');
    const channelTimers: Record<string, Timer> = channelIds.reduce((result, c) => {
      result[c] = createTimer(c);

      return result;
    }, {} as Record<string, Timer>);

    fullTimer.start();

    console.log('Starting test');

    const paymentPromises = channelIds.map(async c => {
      for (let i = 0; i < numPayments; i++) {
        channelTimers[c].start();
        await payerClient.makePayment(c);

        channelTimers[c].stop();
      }
    });
    await Promise.all(paymentPromises);

    fullTimer.stop();
    const maxUpdate = Math.max(...Object.keys(channelTimers).map(k => channelTimers[k].max()));
    const minUpdate = Math.min(...Object.keys(channelTimers).map(k => channelTimers[k].min()));
    const arrayOfMeans = Object.keys(channelTimers).map(k => channelTimers[k].mean());
    const meanUpdate = arrayOfMeans.reduce((a, b) => a + b, 0) / arrayOfMeans.length;
    const arrayOfTotals = Object.keys(channelTimers).map(k => channelTimers[k].stats().total);
    const maxPerChannel = Math.max(...arrayOfTotals);
    const minPerChannel = Math.min(...arrayOfTotals);
    const meanPerChannel = arrayOfTotals.reduce((a, b) => a + b, 0) / arrayOfTotals.length;

    console.log(`Total test run ${fullTimer.took()} MS`);
    const table = new Table({head: ['Action', 'Min (MS)', 'Max (MS)', 'Avg (MS)']});

    table.push(
      ['Individual makePayment call', minUpdate, maxUpdate, meanUpdate],
      [
        `${numPayments} consecutive calls of makePayment`,
        minPerChannel,
        maxPerChannel,
        meanPerChannel,
      ]
    );
    console.log(table.toString());
    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
})();
