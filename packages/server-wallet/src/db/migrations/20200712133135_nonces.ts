import * as Knex from 'knex';

const nonces = 'nonces';
const addresses = 'addresses';
const constraint = 'nonces_addresses_are_valid';
const countInvalidAddresses = 'count_invalid_addresses';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(nonces, table => {
    table.increments('id');
    table
      .integer('value')
      .notNullable()
      .defaultTo(0);
    table
      .specificType(addresses, 'text[]')
      .notNullable()
      .unique();
  });

  await knex.raw(`\
    CREATE OR REPLACE FUNCTION ${countInvalidAddresses}(text[])
    RETURNS boolean AS
    $$
    BEGIN RETURN
    (
      (
        SELECT COALESCE(SUM( CASE WHEN addr ~ '^0x[0-9a-fA-F]{40}$' THEN 0 ELSE 1 END), 0)
        FROM unnest($1) as addr
      ) = 0
    );
    END;
    $$
    LANGUAGE plpgsql IMMUTABLE 
    RETURNS NULL ON NULL INPUT;
  `);

  await knex.raw(
    `ALTER TABLE ${nonces} ADD CONSTRAINT ${constraint} CHECK (${countInvalidAddresses}(addresses));`
  );
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(nonces);
}
