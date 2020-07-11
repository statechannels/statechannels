import Knex from 'knex';
import * as knexConfig from './knexfile';

/**
 * To safely run migrations, we cannot use knexSnakeCaseMappers in the knex config
 * https://github.com/Vincit/objection.js/issues/1144
 */
export default Knex(knexConfig);
