import * as Knex from 'knex';

export function addAddressCheck(knex: Knex, table: string, column: string): Knex.Raw {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_address CHECK (${column} ~ '^0x[0-9a-fA-F]{40}$')
  `);
}

export function addUint48Check(knex: Knex, table: string, column: string): Knex.Raw {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_Uint48 CHECK (${column} >= 0)
  `);
}

export function addBytesCheck(knex: Knex, table: string, column: string): Knex.Raw {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_bytes CHECK (${column} ~ '^0x[0-9a-fA-F]*$')
  `);
}
export function addBytes32Check(knex: Knex, table: string, column: string): Knex.Raw {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_bytes32 CHECK (${column} ~ '^0x[0-9a-fA-F]{64}$')
  `);
}
