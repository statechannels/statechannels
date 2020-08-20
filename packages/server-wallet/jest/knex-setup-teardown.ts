import {configureEnvVariables} from '@statechannels/devtools';
configureEnvVariables();

import adminKnex from '../src/db-admin/db-admin-connection';
import knex from '../src/db/connection';

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
  await knex.destroy();
});
