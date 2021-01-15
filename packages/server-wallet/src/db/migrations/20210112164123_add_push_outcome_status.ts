import * as Knex from 'knex';

import {chainServiceRequests} from './20200915140300_chain_service';

const requestsConstraint = `valid_requests`;
export async function up(knex: Knex): Promise<void> {
  await knex.raw(`\
    ALTER TABLE ${chainServiceRequests}
    DROP CONSTRAINT ${requestsConstraint}
    `);
  await knex.raw(`\
    ALTER TABLE ${chainServiceRequests}
    ADD CONSTRAINT ${requestsConstraint}
    CHECK (
      array_position (ARRAY['fund', 'withdraw', 'challenge','pushOutcome']::VARCHAR[], request ) IS NOT NULL
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`\
    ALTER TABLE ${chainServiceRequests}
    DROP CONSTRAINT ${requestsConstraint}
    `);
  await knex.raw(`\
    ALTER TABLE ${chainServiceRequests}
    ADD CONSTRAINT ${requestsConstraint}
    CHECK (
      array_position (ARRAY['fund', 'withdraw', 'challenge']::VARCHAR[], request ) IS NOT NULL
    )
  `);
}
