import Knex from 'knex';

import {defaultConfig} from '../config';

import * as knexConfig from './knexfile';

/**
 * To safely run migrations, we cannot use knexSnakeCaseMappers in the knex defaultConfig
 * https://github.com/Vincit/objection.js/issues/1144
 */

export default Knex(knexConfig);

export const truncate = async (
  knex: Knex,
  tables = ['signing_wallets', 'channels', 'nonces', 'app_bytecode']
): Promise<void> => {
  if (defaultConfig.nodeEnv !== 'development' && defaultConfig.nodeEnv !== 'test') {
    throw 'No admin connection allowed';
  }
  await Promise.all(tables.map(table => knex.raw(`TRUNCATE TABLE ${table} CASCADE;`)));
};
