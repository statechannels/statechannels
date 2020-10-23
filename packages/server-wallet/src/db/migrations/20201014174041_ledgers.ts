import * as Knex from 'knex';

const tableName = 'ledgers';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(tableName, function(table) {
    table
      .string('ledger_channel_id')
      .primary()
      .references('channel_id')
      .inTable('channels');
    table.string('asset_holder_address').notNullable();
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(tableName);
}
