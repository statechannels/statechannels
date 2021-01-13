import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function (table) {
    table.string('asset_holder_address');
    table.string('funding_ledger_channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function (table) {
    table.dropColumn('asset_holder_address');
    table.dropColumn('funding_ledger_channel_id');
  });
}
