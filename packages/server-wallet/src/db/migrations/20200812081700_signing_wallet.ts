import * as Knex from 'knex';

const signingWallet = 'signing_wallets';
const enforceOneRow = 'enforce_one_row';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(signingWallet, table =>
    table
      .integer(enforceOneRow)
      .unique(enforceOneRow)
      .notNullable()
      .defaultTo(1)
  );

  // https://github.com/knex/knex/issues/266 will add check constraints to knex
  await knex.raw(`\
    ALTER TABLE ${signingWallet}
    ADD CONSTRAINT one_row_constraint
    CHECK (
      ${enforceOneRow} = 1
    )
  `);
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable(signingWallet, table => table.dropColumn(enforceOneRow));
}
