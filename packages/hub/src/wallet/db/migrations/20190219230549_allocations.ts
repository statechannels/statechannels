import * as Knex from 'knex';
import {addAddressCheck, addBytesCheck} from '../utils';

const TABLE_NAME = 'allocations';

exports.up = (knex: Knex) => {
  return knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table
        .integer('channel_state_id')
        .unsigned()
        .notNullable();
      table
        .foreign('channel_state_id')
        .references('channel_states.id')
        .onDelete('CASCADE');
      table
        .integer('priority')
        .unsigned()
        .notNullable();
      table.string('destination').notNullable();
      table.string('amount').notNullable();
      table.string('asset_holder_address').notNullable();

      table.unique(['channel_state_id', 'priority']);
    })
    .then(() => {
      return addBytesCheck(knex, TABLE_NAME, 'destination');
    })
    .then(() => {
      return addAddressCheck(knex, TABLE_NAME, 'asset_holder_address');
    });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
