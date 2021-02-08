import * as Knex from 'knex';

const tableName = 'objectives';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('progress_last_made_at').defaultTo(knex.fn.now()).notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.dropColumn('created_at');
    table.dropColumn('progress_last_made_at');
  });
}
