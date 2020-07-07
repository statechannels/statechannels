import Knex from 'knex';
import {Model} from 'objection';

import {dbCofig} from '../../db-config';

const knex = Knex(dbCofig);
Model.knex(knex);

export default knex;
