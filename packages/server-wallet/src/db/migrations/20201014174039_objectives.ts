import * as Knex from 'knex';

const tableName = 'objectives';
const associativeTableName = 'objectives_channels';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(tableName, function (table) {
    table.string('objective_id').primary();
    table.string('status').notNullable();
    table.string('type').notNullable();
    table.jsonb('data').notNullable();
  });

  await knex.schema.createTable(associativeTableName, function (table) {
    table.string('objective_id').references('objective_id').inTable(tableName).notNullable();
    table.string('channel_id').references('channel_id').inTable('channels').notNullable();
    table.primary(['objective_id', 'channel_id']);
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
  await knex.schema.dropTable(associativeTableName);
}
