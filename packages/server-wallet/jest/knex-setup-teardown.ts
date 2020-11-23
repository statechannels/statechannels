import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';
import _ from 'lodash';

configureEnvVariables();

import {
  extractDBConfigFromServerWalletConfig,
  defaultTestConfig,
  configFromEnvVars,
} from '../src/config';
import {DBAdmin} from '../src/db-admin/db-admin';

export let testKnex: Knex;

beforeAll(async () => {
  testKnex = Knex(
    extractDBConfigFromServerWalletConfig(_.assign({}, defaultTestConfig, configFromEnvVars))
  );
  await new DBAdmin(testKnex).truncateDB();
});

afterAll(async () => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  await testKnex.destroy();
});
