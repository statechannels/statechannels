import * as Knex from 'knex';
import {addBytes32Check, addAddressCheck, addUint48Check} from '../utils';

export async function up(knex: Knex): Promise<any> {
  const name = 'channels';
  await knex.schema.createTable(name, function(table) {
    table.increments('id');
    table.string('channel_id', 64).notNullable();
    table.integer('my_index').notNullable();
    table.string('chain_id', 64).notNullable();
    table.integer('channel_nonce').notNullable();
    table.string('app_definition', 40).notNullable();
    table.integer('challenge_duration').notNullable();

    // TODO: Use this to add a schema check
    // https://github.com/furstenheim/is_jsonb_valid
    // Or, split into their own tables?
    table.jsonb('vars').notNullable();
    table.jsonb('participants').notNullable();
  });

  await addBytes32Check(knex, name, 'channel_id');
  await addAddressCheck(knex, name, 'app_definition');
  await addUint48Check(knex, name, 'channel_nonce');
  await addUint48Check(knex, name, 'challenge_duration');
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable('channels');
}
