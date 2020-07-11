import * as Knex from 'knex';
import { addBytes32Check, addAddressCheck } from '../utils';

const name = 'signing_wallets';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(name, function(table) {
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
  await addBytes32Check(knex, name, 'private_key');
  await addAddressCheck(knex, name, 'address');
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable(name);
}
