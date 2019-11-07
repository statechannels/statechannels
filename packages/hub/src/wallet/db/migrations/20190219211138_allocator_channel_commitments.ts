import * as Knex from 'knex';
const TABLE_NAME = 'allocator_channel_commitments';

exports.up = (knex: Knex) => {
  return knex.schema.createTable(TABLE_NAME, table => {
    table.increments();
    table
      .integer('allocator_channel_id')
      .unsigned()
      .notNullable();
    table
      .foreign('allocator_channel_id')
      .references('allocator_channels.id')
      .onDelete('CASCADE');
    table
      .integer('turn_number')
      .unsigned()
      .notNullable();
    table.string('app_data', 2000).notNullable();

    table.unique(['allocator_channel_id', 'turn_number']);
  });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
