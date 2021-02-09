import {configureEnvVariables} from '@statechannels/devtools';
import Knex from 'knex';
import _ from 'lodash';
import {DBAdmin} from '../src/db-admin/db-admin';

configureEnvVariables();

import {
  extractDBConfigFromServerWalletConfig,
  defaultTestConfig,
  DatabaseConfiguration,
} from '../src/config';

const constructedKnexs: Knex[] = []

/**
 * 
 * @param databaseConfiguration 
 * 
 * returns a knex instance which is automatically destroyed after all jest tests have run
 */
export let constructKnex = (databaseConfiguration: Partial<DatabaseConfiguration>): Knex =>
  {
    const knex = Knex(extractDBConfigFromServerWalletConfig(defaultTestConfig({databaseConfiguration})));
    constructedKnexs.push(knex)

    return knex
  }

export let testKnex: Knex;

beforeAll(async () => {
  testKnex = constructKnex({});
  await DBAdmin.truncateDataBaseFromKnex(testKnex);
});

afterAll(async () => {
  // We need to close the db connection after the test suite has run.
  // Otherwise, jest will not exit within the required one second after the test
  // suite has finished
  await Promise.all(constructedKnexs.map(async knex => knex.destroy()))
});
