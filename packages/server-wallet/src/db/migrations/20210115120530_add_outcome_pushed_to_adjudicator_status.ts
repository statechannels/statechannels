import * as Knex from 'knex';

const table_name = 'adjudicator_status';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(table_name, table => table.boolean('outcome_pushed'));
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(table_name, table => table.dropColumn('outcome_pushed'));
}
