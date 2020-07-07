import * as Knex from 'knex';

const TABLE_NAME = 'channels';

exports.up = (knex: Knex) =>
  knex.schema.createTable(TABLE_NAME, table => {
    table.increments();
    table
      .string('channel_nonce')
      .unsigned()
      .notNullable();
    table.string('channel_id').notNullable();
    table.string('chain_id').notNullable();
    // TODO: Store participants on this table as an array, and add
    // uniqueness on [nonce, participants]
  });

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
