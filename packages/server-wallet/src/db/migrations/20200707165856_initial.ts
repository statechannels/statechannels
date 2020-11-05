import * as Knex from 'knex';

import {addAddressCheckOld, addBytes32CheckOld, addUint48Check, dropConstraint} from '../utils';

const channels = 'channels';
const signingWallets = 'signing_wallets';

export async function addByteContraints(knex: Knex): Promise<void> {
  await addBytes32CheckOld(knex, signingWallets, 'private_key');
  await addAddressCheckOld(knex, signingWallets, 'address');

  await addBytes32CheckOld(knex, channels, 'channel_id');
  await addAddressCheckOld(knex, channels, 'app_definition');
  await addAddressCheckOld(knex, channels, 'signing_address');
}

export async function dropByteConstraints(knex: Knex): Promise<void> {
  await dropConstraint(knex, signingWallets, 'private_key_is_bytes32');
  await dropConstraint(knex, signingWallets, 'address_is_address');

  await dropConstraint(knex, channels, 'channel_id_is_bytes32');
  await dropConstraint(knex, channels, 'app_definition_is_address');
  await dropConstraint(knex, channels, 'signing_address_is_address');
}

export async function up(knex: Knex): Promise<void> {
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

  await addByteContraints(knex);
  await addUint48Check(knex, channels, 'channel_nonce');
  await addUint48Check(knex, channels, 'challenge_duration');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(channels);
  await knex.schema.dropTable(signingWallets);
}
