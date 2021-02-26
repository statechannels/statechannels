import * as Knex from 'knex';

const tableName = 'objectives';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.string('waiting_for').notNullable().defaultTo('');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.dropColumn('waiting_for');
  });
}
