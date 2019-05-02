import { ethers } from 'ethers';
import { Model } from 'objection';
import knex from '../db/connection';
import AllocatorChannel from '../models/allocatorChannel';
import { nitroAdjudicator } from '../utilities/blockchain';

/**
 * funding todos:
 * - test state update.
 *
 * then other event todos.
 * */

async function onDeposit(channelId, amountDeposited, destinationHoldings) {
  console.log(`Deposit detected  with ${amountDeposited} ${destinationHoldings} ${channelId}`);

  const allocatorChannel = await AllocatorChannel.query()
    .where({ channel_id: channelId })
    .select('id')
    .first();

  // todo: is this the correct way to check that the query contains at least one row?
  if (!allocatorChannel) {
    console.log(`Allocator channel ${channelId} not in database`);
    return;
  }

  const numUpdatedRows = await AllocatorChannel.query()
    .patch({ holdings: destinationHoldings.toHexString() })
    .where({ id: allocatorChannel.id });
  console.log(`Updated ${numUpdatedRows} rows`);
}

enum EventType {
  Deposited,
  ChallengeCreated,
}
type EventCallback = (eventType: EventType) => void;

export async function start(eventCallback?: EventCallback) {
  Model.knex(knex);
  console.log('Starting chain watcher');
  const adjudicator: ethers.Contract = await nitroAdjudicator();
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, (channelId, amountDeposited, destinationHoldings) => async {
    await onDeposit(channelId, amountDeposited, destinationHoldings);
    if (eventCallback) {
      eventCallback(EventType.Deposited);
    }
  });

  console.log('Adding challenge watcher');
  const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
  adjudicator.on(challengeCreatedFilter, (channelId, commitment, finalizedAt) => {
    console.log(`Challenge detected  with ${channelId} ${commitment} ${finalizedAt}`);
  });
}

// start();
