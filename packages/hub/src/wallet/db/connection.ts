import Knex from 'knex';
import {Model} from 'objection';

const environment = process.env.NODE_ENV || 'development';
const config = require('../../../knexfile')[environment];

const knex = Knex(config);
Model.knex(knex);

export default knex;
