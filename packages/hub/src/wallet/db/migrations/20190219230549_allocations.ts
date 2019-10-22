import * as Knex from 'knex';
import { addAddressCheck } from '../utils';

const TABLE_NAME = 'allocations';

exports.up = (knex: Knex) => {
  return knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table
        .integer('allocator_channel_commitment_id')
        .unsigned()
        .notNullable();
      table
        .foreign('allocator_channel_commitment_id')
        .references('allocator_channel_commitments.id')
        .onDelete('CASCADE');
      table
        .integer('priority')
        .unsigned()
        .notNullable();
      table.string('destination').notNullable();
      table.string('amount').notNullable();

      table.unique(['allocator_channel_commitment_id', 'priority']);
    })
    .then(() => {
      return addAddressCheck(knex, TABLE_NAME, 'destination');
    });
};

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
