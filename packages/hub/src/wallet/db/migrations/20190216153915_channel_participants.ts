import * as Knex from 'knex';
import {addAddressCheck} from '../utils';
const TABLE_NAME = 'channel_participants';

exports.up = (knex: Knex) =>
  knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table.integer('channel_id').notNullable();
      table
        .foreign('channel_id')
        .references('channels.id')
        .onDelete('CASCADE');
      table.string('address').notNullable();
      table.integer('priority').notNullable();

      table.unique(['channel_id', 'address']);
      table.unique(['channel_id', 'priority']);
    })
    .then(() => addAddressCheck(knex, TABLE_NAME, 'address'));

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
