import * as Knex from 'knex';

const tableName = 'close-channel-objectives';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable(tableName, function(table) {
    table.integer('objectiveId').primary();
    table.string('status');
    table.string('type');
    table.string('targetChannelId');
    table.string('fundingStrategy');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
