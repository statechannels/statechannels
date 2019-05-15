import * as Knex from 'knex';
import { addBytesCheck } from '../utils';

const TABLE_NAME = 'allocator_channels';

exports.up = (knex: Knex) => {
  return knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table.string('rules_address').notNullable(); // TODO: This should reference the rules table
      table
        .integer('nonce')
        .unsigned()
        .notNullable();
      table.text('holdings').notNullable(); // has to store a uint256
      table.string('channel_id').notNullable();
      // TODO: Store participants on this table as an array, and add
      // uniqueness on [nonce, participants]
    })
    .then(() => {
      return addBytesCheck(knex, TABLE_NAME, 'holdings');
    });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
