import * as Knex from 'knex';
import {addAddressCheck, addBytesCheck} from '../utils';
const TABLE_NAME = 'channel_holdings';

exports.up = (knex: Knex) =>
  knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table.integer('channel_id').notNullable();
      table
        .foreign('channel_id')
        .references('channels.id')
        .onDelete('CASCADE');
      table.string('asset_holder_address').notNullable();
      table.string('amount').notNullable();

      table.unique(['channel_id', 'asset_holder_address']);
    })
    .then(() => addAddressCheck(knex, TABLE_NAME, 'asset_holder_address'))
    .then(() => addBytesCheck(knex, TABLE_NAME, 'amount'));

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
