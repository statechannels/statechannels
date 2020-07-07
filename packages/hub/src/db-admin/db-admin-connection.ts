import Knex from 'knex';
import {Model} from 'objection';
import * as knexConfig from './knexfile';

const knex = Knex(knexConfig);
Model.knex(knex);

export default knex;
