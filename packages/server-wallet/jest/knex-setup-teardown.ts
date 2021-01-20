import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';
import _ from 'lodash';
import * as DBAdmin from '../src/db-admin/db-admin'

configureEnvVariables();

import {extractDBConfigFromServerWalletConfig, defaultTestConfig} from '../src/config';


export let testKnex: Knex;

beforeAll(async () => {
  testKnex = Knex(extractDBConfigFromServerWalletConfig(defaultTestConfig()));
  await DBAdmin.truncateDataBaseFromKnex(testKnex);
});

afterAll(async () => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  await testKnex.destroy();
});
