import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable('open-channel-objectives', function(table) {
    table.integer('objectiveId');
    table.string('status');
    table.string('type');
    table.string('targetChannelId');
    table.string('fundingStrategy');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable('objectives');
}
