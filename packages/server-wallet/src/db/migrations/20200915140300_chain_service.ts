import * as Knex from 'knex';

const channels = 'channels';
const chainServiceRequests = 'chain_service_requests';
const fundingStrategy = 'funding_strategy';
const defaultFundingStrategy = 'Unknown';
const chainServiceRequestsConstraint = `valid_chain_service_requests`;

export async function addValidChainServiceRequests(knex: Knex, columns: string): Promise<any> {
  await knex.raw(`\
    ALTER TABLE ${channels}
    ADD CONSTRAINT ${chainServiceRequestsConstraint}
    CHECK (
      ${chainServiceRequests} <@ ARRAY[${columns}]
    )
  `);
}

export async function dropValidChainServiceRequests(knex: Knex): Promise<any> {
  await knex.raw(`\
    ALTER TABLE ${channels}
    DROP CONSTRAINT ${chainServiceRequestsConstraint}
  `);
}

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => {
    table
      .specificType(chainServiceRequests, 'text[]')
      .notNullable()
      .defaultTo('{}');
    table
      .string(fundingStrategy)
      .notNullable()
      .defaultTo(defaultFundingStrategy);
  });

  await addValidChainServiceRequests(knex, "'fund'");
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => {
    table.dropColumn(chainServiceRequests);
    table.dropColumn(fundingStrategy);
  });
}
