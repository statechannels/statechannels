import * as Knex from 'knex';

const tableName = 'ledger_requests';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(tableName, function(table) {
    table
      .string('ledger_channel_id')
      .primary()
      .references('channel_id')
      .inTable('channels'); // or in ledgers?
    table
      .string('funding_channel_id')
      .notNullable()
      .references('channel_id')
      .inTable('channels'); // or in ledgers?
    table.string('status').notNullable();
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
