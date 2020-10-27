import * as Knex from 'knex';

const channels = 'channels';
const chainServiceRequests = 'chain_service_requests';
const chainServiceRequestsConstraint = `valid_chain_service_requests`;

function dropConstraint(knex: Knex): Knex.Raw<any> {
  return knex.raw(`\
    ALTER TABLE ${channels}
    DROP CONSTRAINT ${chainServiceRequestsConstraint}
  `);
}

export async function up(knex: Knex): Promise<any> {
  await dropConstraint(knex);

  await knex.raw(`\
    ALTER TABLE ${channels}
    ADD CONSTRAINT valid_chain_service_requests
    CHECK (
      ${chainServiceRequests} <@ ARRAY['fund', 'withdraw']
    )
  `);
}

export async function down(knex: Knex): Promise<any> {
  await dropConstraint(knex);
}
