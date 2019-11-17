import * as Knex from 'knex';
import {addBytesCheck} from '../utils';

const TABLE_NAME = 'allocations';

exports.up = (knex: Knex) => {
  return knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table
        .integer('outcome_id')
        .unsigned()
        .notNullable();
      table
        .foreign('outcome_id')
        .references('outcomes.id')
        .onDelete('CASCADE');
      table
        .integer('priority')
        .unsigned()
        .notNullable();
      table.string('destination').notNullable();
      table.string('amount');

      table.unique(['outcome_id', 'priority']);
    })
    .then(() => {
      return addBytesCheck(knex, TABLE_NAME, 'destination');
    });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
