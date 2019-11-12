import * as Knex from 'knex';
const TABLE_NAME = 'channel_states';

exports.up = (knex: Knex) => {
  return knex.schema.createTable(TABLE_NAME, table => {
    table.increments();
    table
      .integer('channel_id')
      .unsigned()
      .notNullable();
    table
      .foreign('channel_id')
      .references('channels.id')
      .onDelete('CASCADE');
    table
      .integer('turn_num')
      .unsigned()
      .notNullable();
    table.text('app_data').notNullable();

    table.unique(['channel_id', 'turn_num']);
  });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
