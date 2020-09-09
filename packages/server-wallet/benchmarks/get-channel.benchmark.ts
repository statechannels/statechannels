import _ from 'lodash';
import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';

configureEnvVariables();

import adminKnex from '../src/db-admin/db-admin-connection';
import {seedAlicesSigningWallet} from '../src/db/seeds/1_signing_wallet_seeds';
import {withSupportedState} from '../src/models/__test__/fixtures/channel';
import {stateVars} from '../src/wallet/__test__/fixtures/state-vars';
import {Channel} from '../src/models/channel';
import {Wallet} from '../src/wallet';
import {extractDBConfigFromServerWalletConfig, defaultConfig} from '../src/config';

const knex: Knex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

async function benchmark(): Promise<void> {
  await adminKnex.migrate.rollback();
  await adminKnex.migrate.latest();

  await seedAlicesSigningWallet(knex);
  const c = withSupportedState()({vars: [stateVars()]});
  const result = await Channel.query().insert(c);

  c.protocolState;

  result.protocolState;

  const wallet = new Wallet(defaultConfig);

  const NUM_CALLS = 100;
  const iter = _.range(NUM_CALLS);
  const key = `getChannel x ${NUM_CALLS}`;
  console.time(key);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _i of iter) {
    await wallet.getState({channelId: c.channelId});
  }
  console.timeEnd(key);

  await adminKnex.destroy();
  await knex.destroy();
}

benchmark();
