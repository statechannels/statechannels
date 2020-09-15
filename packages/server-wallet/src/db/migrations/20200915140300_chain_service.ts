import * as Knex from 'knex';

const channels = 'channels';
const chainServiceRequests = 'chain_service_requests';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => table.jsonb(chainServiceRequests));
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => table.dropColumn(chainServiceRequests));
}
