import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';

configureEnvVariables();

import {extractDBConfigFromServerWalletConfig, defaultConfig} from '../src/config';
import {DBAdmin} from '../src/db-admin/db-admin';

export let testKnex: Knex;

// Helpful tip...
// If you encounter
// MigrationLocked: Migration table is already locked
// Then add the following to beforeAll:
// await adminKnex.raw('DELETE FROM knex_migrations_lock WHERE is_locked = 1;');

beforeAll(async () => {
  testKnex = Knex(extractDBConfigFromServerWalletConfig(defaultConfig));
  await new DBAdmin(testKnex).truncateDB();
});

afterEach(async () => {});
afterAll(async () => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  await testKnex.destroy();
});
