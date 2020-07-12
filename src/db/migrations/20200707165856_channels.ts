import * as Knex from 'knex';
import { addBytes32Check, addAddressCheck, addUint48Check } from '../utils';

const channels = 'channels';
const signingWallets = 'signing_wallets';
export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(signingWallets, function(table) {
    table.increments('id');
    table
      .string('private_key')
      .notNullable()
      .unique();
    table
      .string('address')
      .notNullable()
      .unique();
  });
  await addBytes32Check(knex, signingWallets, 'private_key');
  await addAddressCheck(knex, signingWallets, 'address');

  await knex.schema.createTable(channels, function(table) {
    table.increments('id');
    table
      .string('channel_id')
      .notNullable()
      .unique();
    table.string('signing_address').notNullable();
    table.foreign('signing_address').references('signing_wallets.address');
    table.string('chain_id').notNullable();
    table.integer('channel_nonce').notNullable();
    table.string('app_definition').notNullable();
    table.integer('challenge_duration').notNullable();

    // TODO: Use this to add a schema check
    // https://github.com/furstenheim/is_jsonb_valid
    // Or, split into their own tables?
    table.jsonb('vars').notNullable();
    table.jsonb('participants').notNullable();
  });

  await addBytes32Check(knex, channels, 'channel_id');
  await addAddressCheck(knex, channels, 'app_definition');
  await addAddressCheck(knex, channels, 'signing_address');
  await addUint48Check(knex, channels, 'channel_nonce');
  await addUint48Check(knex, channels, 'challenge_duration');
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(channels);
  await knex.schema.dropTable(signingWallets);
}
