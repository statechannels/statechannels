import * as Knex from 'knex';

const tableName = 'finalization_status';
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable(tableName, function(table) {
    table.string('channel_id').notNullable();
    table.integer('finalizes_at').notNullable();
    table.integer('block_number').notNullable();

    table.primary(['channel_id']);
    table.foreign('channel_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable(tableName);
}
