import * as Knex from 'knex';

export const chain_transactions = 'chain_transactions';
export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(chain_transactions, function(table) {
    table.string('channel_id').notNullable();
    table.string('fingerprint').notNullable();
    table.timestamp('timestamp').notNullable();

    table.primary(['channel_id', 'timestamp']);
    table.foreign('channel_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(chain_transactions);
}
