import * as Knex from 'knex';

export function addAddressCheck(knex: Knex, table: string, column: string) {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_address CHECK (${column} ~ '^0x[0-9a-fA-f]{40}$')
  `);
}

export function addBytesCheck(knex: Knex, table: string, column: string) {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_bytes CHECK (${column} ~ '^0x[0-9a-fA-f]*$')
  `);
}
