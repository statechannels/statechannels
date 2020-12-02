import * as Knex from 'knex';

import {channels} from './20200707165856_initial';
import {addValidChainServiceRequests, chainServiceRequests} from './20200915140300_chain_service';

export const chain_service_requests = 'chain_service_requests';
const requestsConstraint = `valid_requests`;

export async function up(knex: Knex): Promise<any> {
  await knex.schema.alterTable(channels, table => table.dropColumn(chainServiceRequests));

  await knex.schema.createTable(chain_service_requests, function(table) {
    table.string('channel_id').notNullable();
    table.string('request').notNullable();
    table.timestamp('timestamp').notNullable();
    table.integer('attempts').defaultTo(1);

    table.primary(['channel_id', 'request']);
    table.foreign('channel_id').references('channels.channel_id');
  });

  await knex.raw(`\
    ALTER TABLE ${chainServiceRequests}
    ADD CONSTRAINT ${requestsConstraint}
    CHECK (
      request = 'fund' OR request = 'withdraw' OR request = 'challenge'
    )
  `);
}

export async function down(knex: Knex): Promise<any> {
  await knex.schema.dropTable(chain_service_requests);

  await knex.schema.alterTable(channels, table => {
    table
      .specificType(chainServiceRequests, 'text[]')
      .notNullable()
      .defaultTo('{}');
  });
  await addValidChainServiceRequests(knex, "'fund', 'withdraw'");
}
