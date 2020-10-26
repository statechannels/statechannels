import * as Knex from 'knex';

const tableName = 'ledger_requests';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(tableName, function(table) {
    table
      .string('ledger_channel_id')
      .references('channel_id')
      .inTable('channels');
    table
      .string('channel_to_be_funded')
      .notNullable()
      .references('channel_id')
      .inTable('channels');
    table.string('status').notNullable();
    table.string('type').notNullable();
    table.primary(['channel_to_be_funded', 'type']);
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
