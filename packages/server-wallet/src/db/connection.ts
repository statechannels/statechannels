import {Model} from 'objection';
import Knex from 'knex';

import {dbConfig} from '../db/config';

const knex = Knex(dbConfig);
Model.knex(knex);

export default knex;
