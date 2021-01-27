import * as Knex from 'knex';

const tableName = 'channels';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.jsonb('initial_support').notNullable().defaultTo([]);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.dropColumn('initial_support');
  });
}
