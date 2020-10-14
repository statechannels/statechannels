import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable('objectives', function(table) {
    table.integer('objectiveId');
    table.string('status');
    table.string('type');
    table.text('participants');
    table.text('data');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable('objectives');
}
