#!/usr/bin/env node

import {Participant} from '@statechannels/client-api-schema';
import yargs from 'yargs';
import Table from 'cli-table3';
import {Timer} from 'unitimer';
import createTimer from 'unitimer';
import {alice, bob} from '../src/wallet/__test__/fixtures/signing-wallets';
import {Channel} from '../src/models/channel';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {SigningWallet} from '../src/models/signing-wallet';
import {truncate} from '../src/db-admin/db-admin-connection';
import knexPing from '../src/db/connection';
import {
  knexPong,
  startPongServer,
  waitForServerToStart,
  killServer,
  PongServer,
} from '../e2e-test/e2e-utils';
import PingClient from '../e2e-test/ping/client';
async function seedTestChannels(
  ping: Participant,
  pingPrivateKey: string,
  pong: Participant,
  pongPrivateKey: string,
  numOfChannels: number
): Promise<string[]> {
  const channelIds: string[] = [];
  for (let i = 0; i < numOfChannels; i++) {
    const seed = withSupportedState(
      {turnNum: 3},
      {
        channelNonce: i,
        participants: [ping, pong],
      },
      [
        SigningWallet.fromJson({privateKey: pingPrivateKey}),
        SigningWallet.fromJson({privateKey: pongPrivateKey}),
      ]
    )();
    await Channel.bindKnex(knexPing)
      .query()
      .insert([{...seed, signingAddress: ping.signingAddress}]); // Fixture uses alice() default
    await Channel.bindKnex(knexPong)
      .query()
      .insert([{...seed, signingAddress: pong.signingAddress}]);
    channelIds.push(seed.channelId);
  }
  return channelIds;
}

(async function(): Promise<void> {
 const { numChannels, numPings} = yargs
  .command('stress-test', 'Ping many channels concurrently')
    .example(
      'stress-test --numChannels 20 --numPings 5',
      'Runs the stress test using 20 channels calling ping 5 times on each channel'
    )
  .options({
    numChannels: {type: 'number'},
    numPings: {type: 'number'},
  })
    .default({numPings: 1, numChannels: 100}).argv;

  process.on('exit', async () => {
    if (pongServer) {
      // TODO: Determine why killServer doesn't work node script
      pongServer.server.kill();
      await killServer(pongServer);
    }
  });
  let pongServer: PongServer | undefined = undefined;
  try {
    pongServer = startPongServer();
    await waitForServerToStart(pongServer);

    // Adds Alice to Ping's Database
    await truncate(knexPing);

    await SigningWallet.query(knexPing).insert(alice());

    // Adds Bob to Pong's Database
    await truncate(knexPong);
    await SigningWallet.bindKnex(knexPong)
      .query()
      .insert(bob());

    const pingClient = new PingClient(alice().privateKey, `http://127.0.0.1:65535`);

    console.log('seeding channels');
    const channelIds = await seedTestChannels(
      pingClient.me,
      alice().privateKey,
      await pingClient.getPongsParticipantInfo(),
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

    const pingPromises = channelIds.map(async c => {
      for (let i = 0; i < numPings; i++) {
        channelTimers[c].start();
        await pingClient.ping(c);

        channelTimers[c].stop();
      }
    });
    await Promise.all(pingPromises);

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
      ['Individual Ping call', minUpdate, maxUpdate, meanUpdate],
      [`${numPings} consecutive calls of Ping`, minPerChannel, maxPerChannel, meanPerChannel]
    );
    console.log(table.toString());
    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
})();
