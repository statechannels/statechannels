import * as Knex from 'knex';

const tableName = 'ledger_requests';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.string('amount_a');
    table.string('amount_b');
    table.integer('last_seen_agreed_state');
    table.integer('missed_opportunity_count');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.dropColumn('amount_a');
    table.dropColumn('amount_b');
    table.dropColumn('last_seen_agreed_state');
    table.dropColumn('missed_opportunity_count');
  });
}
