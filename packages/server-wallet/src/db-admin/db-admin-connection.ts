import Knex from 'knex';

import config from '../config';

import * as knexConfig from './knexfile';

/**
 * To safely run migrations, we cannot use knexSnakeCaseMappers in the knex config
 * https://github.com/Vincit/objection.js/issues/1144
 */

export default Knex(knexConfig);

export const truncate = async (
  knex: Knex,
  tables = ['signing_wallets', 'channels', 'nonces']
): Promise<void> => {
  if (config.nodeEnv !== 'development' && config.nodeEnv !== 'test') {
    throw 'No admin connection allowed';
  }
  await Promise.all(tables.map(table => knex.raw(`TRUNCATE TABLE ${table} CASCADE;`)));
};
