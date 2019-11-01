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
    table
      .integer('commitment_type')
      .unsigned()
      .notNullable();
    table
      .integer('commitment_count')
      .unsigned()
      .notNullable();
    table.json('app_attrs').notNullable();

    table.unique(['allocator_channel_id', 'turn_number']);
  });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
