import * as Knex from 'knex';
import {addAddressCheck} from '../utils';

const TABLE_NAME = 'outcomes';

exports.up = (knex: Knex) =>
  knex.schema
    .createTable(TABLE_NAME, table => {
      table.increments();
      table
        .integer('channel_state_id')
        .unsigned()
        .notNullable();
      table
        .foreign('channel_state_id')
        .references('channel_states.id')
        .onDelete('CASCADE');
      table.string('asset_holder_address').notNullable();
      table.string('target_channel_id');
    })
    .then(() => addAddressCheck(knex, TABLE_NAME, 'asset_holder_address'));

exports.down = (knex: Knex) => knex.schema.dropTable(TABLE_NAME);
