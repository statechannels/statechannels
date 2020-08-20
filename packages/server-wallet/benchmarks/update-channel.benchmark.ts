import _ from 'lodash';
import {AddressZero} from '@ethersproject/constants';
import {configureEnvVariables} from '@statechannels/devtools';
configureEnvVariables();

import walletConfig from '../src/config';
import adminKnex from '../src/db-admin/db-admin-connection';
import knex from '../src/db/connection';
import {seedAlicesSigningWallet} from '../src/db/seeds/1_signing_wallet_seeds';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {Channel} from '../src/models/channel';
import {Wallet} from '../src/wallet';

async function benchmark(): Promise<void> {
  await adminKnex.migrate.rollback();
  await adminKnex.migrate.latest();

  await seedAlicesSigningWallet(knex);
  const NUM_UPDATES = walletConfig.timingMetrics ? 5 : 50;
  const iter = _.range(NUM_UPDATES);

  const channels = [];
  for (const channelNonce of iter) {
    const c = withSupportedState()({channelNonce, vars: [stateVars({turnNum: 3})]});
    await Channel.query().insert(c);

    channels.push(c);
  }

  const wallet = new Wallet();

  const key = `updateChannel x ${NUM_UPDATES}`;
  console.time(key);
  for (const i of iter) {
    await wallet.updateChannel({
      channelId: channels[i].channelId,
      allocations: [{token: AddressZero, allocationItems: []}],
      appData: '0x',
    });
  }
  console.timeEnd(key);

  await adminKnex.destroy();
  await knex.destroy();
}

benchmark();
