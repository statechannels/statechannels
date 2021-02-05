import * as Knex from 'knex';

const tableName = 'objectives';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.timestamps(false, true); // uses datetime types
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable(tableName, table => {
    table.dropTimestamps();
  });
}
