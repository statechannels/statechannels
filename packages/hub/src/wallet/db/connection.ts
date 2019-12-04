import Knex from 'knex';
import {Model} from 'objection';
import * as knexConfig from '../../config/knexfile';

const environment = process.env.NODE_ENV || 'development';
let config: Knex.Config;
if (environment === 'test') {
  config = knexConfig.test;
} else if (environment === 'development') {
  config = knexConfig.development;
} else {
  throw new Error(`Unknown NODE_ENV with value of ${process.env.NODE_ENV}`);
}

const knex = Knex(config);
Model.knex(knex);

export default knex;
