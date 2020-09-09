import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';

configureEnvVariables();

import adminKnex from '../src/db-admin/db-admin-connection';
import {extractDBConfigFromServerWalletConfig, defaultConfig} from '../src/config';

export const testKnex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));

beforeAll(async () => {
  await adminKnex.migrate.rollback();
  await adminKnex.migrate.latest();
});

afterEach(async () => {
  await adminKnex.raw('TRUNCATE TABLE channels RESTART IDENTITY CASCADE');
});
afterAll(async () => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  await adminKnex.destroy();
  await testKnex.destroy();
});
