import _ from 'lodash';
import {configureEnvVariables} from '@statechannels/devtools';
import {ethers} from 'ethers';
import Knex from 'knex';

configureEnvVariables();

import adminKnex from '../src/db-admin/db-admin-connection';
import {seedAlicesSigningWallet} from '../src/db/seeds/1_signing_wallet_seeds';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {Channel} from '../src/models/channel';
import {Wallet} from '../src/wallet';
import {defaultConfig, extractDBConfigFromServerWalletConfig} from '../src/config';

const knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

const NUM_UPDATES = defaultConfig.timingMetrics ? 10 : 100;
const iter = _.range(NUM_UPDATES);

async function setup(): Promise<Channel[]> {
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
  await adminKnex.migrate.rollback();
  await adminKnex.migrate.latest();

  let channels = await setup();

  const wallet = new Wallet(defaultConfig);

  let key: string;
  console.time((key = `serial x ${NUM_UPDATES}`));
  for (const i of iter) {
    await wallet.updateChannel({
      channelId: channels[i].channelId,
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

  await adminKnex.destroy();
  await knex.destroy();
}

benchmark();
