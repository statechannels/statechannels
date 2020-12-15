import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function(table) {
    table.jsonb('my_ledger_proposal');
    table.jsonb('their_ledger_proposal');
    table
      .integer('my_ledger_proposal_nonce')
      .notNullable()
      .defaultTo(0)
      .unsigned();
    table
      .integer('their_ledger_proposal_nonce')
      .notNullable()
      .defaultTo(0)
      .unsigned();
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function(table) {
    table.dropColumn('my_ledger_proposal');
    table.dropColumn('their_ledger_proposal');
    table.dropColumn('my_ledger_proposal_nonce');
    table.dropColumn('their_ledger_proposal_nonce');
  });
}
