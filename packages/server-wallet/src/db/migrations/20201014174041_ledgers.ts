import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function(table) {
    table.string('asset_holder_address');
    table.string('funding_ledger_channel_id');
    table.jsonb('my_unsigned_commitment');
    table.jsonb('their_unsigned_commitment');
    table
      .integer('my_unsigned_commitment_nonce')
      .notNullable()
      .defaultTo(0)
      .unsigned();
    table
      .integer('their_unsigned_commitment_nonce')
      .notNullable()
      .defaultTo(0)
      .unsigned();
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.table('channels', function(table) {
    table.dropColumn('asset_holder_address');
    table.dropColumn('funding_ledger_channel_id');
    table.dropColumn('my_unsigned_commitment');
    table.dropColumn('their_unsigned_commitment');
    table.dropColumn('my_unsigned_commitment_nonce');
    table.dropColumn('their_unsigned_commitment_nonce');
  });
}
