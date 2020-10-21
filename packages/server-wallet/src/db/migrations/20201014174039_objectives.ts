import * as Knex from 'knex';

const tableName = 'objectives';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable(tableName, function(table) {
    table.string('objective_id').primary();
    table.string('status').notNullable();
    table.string('type').notNullable();
    table.jsonb('data');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
