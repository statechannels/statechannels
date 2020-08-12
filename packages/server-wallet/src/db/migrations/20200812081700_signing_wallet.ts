import * as Knex from 'knex';

const signingWallet = 'signing_wallets';
const oneRowConstraint = 'one_row_constraint';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(signingWallet, table =>
    table
      .integer(oneRowConstraint)
      .unique(oneRowConstraint)
      .notNullable()
      .defaultTo(1)
  );
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable(signingWallet, table => table.dropColumn(oneRowConstraint));
}
