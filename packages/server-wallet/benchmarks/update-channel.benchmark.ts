import _ from 'lodash';
import {configureEnvVariables} from '@statechannels/devtools';
import {ethers} from 'ethers';
import Knex from 'knex';

configureEnvVariables();

import {seedAlicesSigningWallet} from '../src/db/seeds/1_signing_wallet_seeds';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {Channel} from '../src/models/channel';
import {Wallet} from '../src/wallet';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../src/config';

const knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

const NUM_UPDATES = defaultConfig.timingMetrics ? 10 : 100;

async function setup(n = NUM_UPDATES): Promise<Channel[]> {
  const iter = _.range(n);
  await seedAlicesSigningWallet(knex);

  const channels = [];
  for (const channelNonce of iter) {
    const c = withSupportedState()({channelNonce, vars: [stateVars({turnNum: 3})]});
    await Channel.query(knex).insert(c);

    channels.push(c);
  }

  return channels;
}

async function benchmark(): Promise<void> {
  await knex.migrate.rollback();
  await knex.migrate.latest();
  const wallet = new Wallet(defaultConfig);

  // Warm up each worker thread.
  // eslint-disable-next-line no-process-env
  let channels = await setup(Number(process.env.AMOUNT_OF_WORKER_THREADS ?? 0));

  await Promise.all(
    channels.map(async channel =>
      wallet.updateChannel({
        channelId: channel.channelId,
        allocations: [{token: ethers.constants.AddressZero, allocationItems: []}],
        appData: '0x',
      })
    )
  );

  channels = await setup();

  let key: string;
  console.time((key = `serial x ${NUM_UPDATES}`));
  for (const channel of channels) {
    await wallet.updateChannel({
      channelId: channel.channelId,
      allocations: [{token: ethers.constants.AddressZero, allocationItems: []}],
      appData: '0x',
    });
  }
  console.timeEnd(key);

  channels = await setup();

  console.time((key = `concurrent x ${NUM_UPDATES}`));
  await Promise.all(
    channels.map(async channel =>
      wallet.updateChannel({
        channelId: channel.channelId,
        allocations: [{token: ethers.constants.AddressZero, allocationItems: []}],
        appData: '0x',
      })
    )
  );

  console.timeEnd(key);

  await knex.destroy();
  await wallet.destroy();
}

benchmark();
