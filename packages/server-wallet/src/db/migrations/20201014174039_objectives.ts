import * as Knex from 'knex';

const tableName = 'objectives';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable(tableName, function(table) {
    table.string('objective_id').primary();
    table.string('status').notNullable();
    table.string('type').notNullable();
    table.string('target_channel_id');
    table.string('funding_strategy');
    table.string('ledger_id');
    table.string('joint_channel_id');
    table.string('guarantor_id');

    table.foreign('target_channel_id').references('channels.channel_id');
    table.foreign('ledger_id').references('channels.channel_id');
    table.foreign('joint_channel_id').references('channels.channel_id');
    table.foreign('guarantor_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
