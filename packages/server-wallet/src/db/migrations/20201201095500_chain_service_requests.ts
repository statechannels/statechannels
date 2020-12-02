import * as Knex from 'knex';

export const chain_service_requests = 'chain_service_requests';
export async function up(knex: Knex): Promise<any> {
  await knex.schema.createTable(chain_service_requests, function(table) {
    table.string('channel_id').notNullable();
    table.string('request').notNullable();
    table.timestamp('timestamp').notNullable();
    table.integer('attempts').defaultTo(1);

    table.primary(['channel_id', 'request']);
    table.foreign('channel_id').references('channels.channel_id');
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(chain_service_requests);
}
