import * as Knex from 'knex';
const TABLE_NAME = 'wallet_processes';

exports.up = (knex: Knex) =>
  knex.schema.createTable(TABLE_NAME, table => {
    table.increments();
    table
      .string('process_id')
      .notNullable()
      .unique();
    table.string('protocol').notNullable();
    table.string('their_address').notNullable();
  });

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
