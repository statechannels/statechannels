import * as Knex from 'knex';

const funding = 'funding';
export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(funding, function(table) {
    table.string('channel_id').notNullable();
    table.string('amount').notNullable();
    table.string('asset_holder').notNullable();

    table.primary(['channel_id', 'asset_holder']);
    table.foreign('channel_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(funding);
}
