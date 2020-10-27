import * as Knex from 'knex';

import {
  addValidChainServiceRequests,
  dropValidChainServiceRequests,
} from './20200915140300_chain_service';

export async function up(knex: Knex): Promise<any> {
  await dropValidChainServiceRequests(knex);
  await addValidChainServiceRequests(knex, "'fund', 'withdraw'");
}

export async function down(knex: Knex): Promise<any> {
  await dropValidChainServiceRequests(knex);
  await addValidChainServiceRequests(knex, "'fund'");
}
