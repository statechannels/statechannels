import * as Knex from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('ledger_requests', function(table) {
    table.index('ledger_channel_id');
  });
}

export async function down(_knex: Knex): Promise<void> {
  //
}
