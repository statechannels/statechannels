import { config as dotenvConfig } from 'dotenv';
import * as Knex from 'knex';

dotenvConfig();

const environment = process.env.NODE_ENV || 'development';
// tslint:disable-next-line:no-var-requires
const config = require('../../../knexfile')[environment];

const knex = Knex(config);

import { Model } from 'objection';
Model.knex(knex);

export default knex;
