import * as Knex from 'knex';

import {addAddressCheck, addBytes32Check, addBytesCheck, dropConstraint} from '../utils';

import {
  dropByteConstraints as dropOldByteConstraints,
  addByteContraints as addOldByteContraints,
} from './20200707165856_initial';

const channels = 'channels';
const signingWallets = 'signing_wallets';
const app_bytecode = 'app_bytecode';
const funding = 'funding';

export async function addByteContraints(knex: Knex): Promise<void> {
  await addBytes32Check(knex, signingWallets, 'private_key');

  await addBytes32Check(knex, channels, 'channel_id');
  await addBytes32Check(knex, channels, 'funding_ledger_channel_id');

  await addAddressCheck(knex, app_bytecode, 'app_definition');
  await addBytesCheck(knex, app_bytecode, app_bytecode);

  await addAddressCheck(knex, funding, 'asset_holder');
}

export async function dropByteConstraints(knex: Knex): Promise<void> {
  await dropConstraint(knex, signingWallets, 'private_key_is_bytes32');

  await dropConstraint(knex, channels, 'channel_id_is_bytes32');
  await dropConstraint(knex, channels, 'funding_ledger_channel_id_is_bytes32');

  await dropConstraint(knex, app_bytecode, 'app_definition_is_address');
  await dropConstraint(knex, app_bytecode, 'app_bytecode_is_bytes');

  await dropConstraint(knex, funding, 'asset_holder_is_address');
}

export async function up(knex: Knex): Promise<any> {
  await dropOldByteConstraints(knex);
  await addByteContraints(knex);
}

export async function down(knex: Knex): Promise<any> {
  await dropByteConstraints(knex);
  await addOldByteContraints(knex);
}
