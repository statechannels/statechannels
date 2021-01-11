import * as Knex from 'knex';

const tableName = 'challenge_status';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => table.jsonb('challenge_state').nullable());
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => table.dropColumn('challenge_state'));
}
