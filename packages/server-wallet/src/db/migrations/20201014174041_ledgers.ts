import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function (table) {
    table.boolean('is_ledger_channel').notNullable().defaultTo(false);
    table.string('funding_ledger_channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function (table) {
    table.dropColumn('is_ledger_channel');
    table.dropColumn('funding_ledger_channel_id');
  });
}
