import * as Knex from 'knex';
import { addAddressCheck } from '../utils';
const TABLE_NAME = 'allocator_channel_participants';

exports.up = (knex: Knex) => {
  return knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table.integer('allocator_channel_id').notNullable();
      table
        .foreign('allocator_channel_id')
        .references('allocator_channels.id')
        .onDelete('CASCADE');
      table.string('address').notNullable();
      table.integer('priority').notNullable();

      table.unique(['allocator_channel_id', 'address']);
      table.unique(['allocator_channel_id', 'priority']);
    })
    .then(() => {
      return addAddressCheck(knex, TABLE_NAME, 'address');
    });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
