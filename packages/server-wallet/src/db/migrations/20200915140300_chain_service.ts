import * as Knex from 'knex';
import {FundingStrategy} from '@statechannels/client-api-schema';

const channels = 'channels';
const chainServiceRequests = 'chain_service_requests';
const fundingStrategy = 'funding_strategy';
const defaultFundingStrategy: FundingStrategy = 'Unknown';

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => {
    table.specificType(chainServiceRequests, 'text[]').notNullable();
    table
      .string(fundingStrategy)
      .notNullable()
      .defaultTo(defaultFundingStrategy);
  });
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => {
    table.dropColumn(chainServiceRequests);
    table.dropColumn(fundingStrategy);
  });
}
