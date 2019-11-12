import {
  AssetOutcome,
  isAllocationOutcome,
  Outcome
} from '@statechannels/nitro-protocol/src/contract/outcome';
import * as Knex from 'knex';

export function addAddressCheck(knex: Knex, table: string, column: string) {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_address CHECK (${column} ~ '^0x[0-9a-fA-f]{40}$')
  `);
}

export function addBytesCheck(knex: Knex, table: string, column: string) {
  return knex.raw(`\
    ALTER TABLE ${table}\
    ADD CONSTRAINT ${column}_is_bytes CHECK (${column} ~ '^0x[0-9a-fA-f]*$')
  `);
}

function assetOutcomeAddPriorities(assetOutcome: AssetOutcome) {
  if (isAllocationOutcome(assetOutcome)) {
    const allocationsWithPriorities = assetOutcome.allocation.map((allocationItem, index) => ({
      ...allocationItem,
      priority: index
    }));
    return {...assetOutcome, allocation: allocationsWithPriorities};
  }
}

export function outcomeAddPriorities(outcome: Outcome) {
  return outcome.map(assetOutcomeAddPriorities);
}
