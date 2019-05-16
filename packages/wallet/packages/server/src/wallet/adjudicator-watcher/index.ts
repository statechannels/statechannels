import { ethers } from 'ethers';
import { Model } from 'objection';
import knex from '../db/connection';
import AllocatorChannel from '../models/allocatorChannel';
import { nitroAdjudicator } from '../utilities/blockchain';

/**
 * todos:
 * - wire up then other events.
 */

enum EventType {
  Deposited,
  ChallengeCreated,
}
type EventCallback = (eventType: EventType) => void;

async function onDeposit(channelId, amountDeposited, destinationHoldings) {
  console.log(`Deposit detected  with ${amountDeposited} ${destinationHoldings} ${channelId}`);

  const allocatorChannel = await AllocatorChannel.query()
    .where('channel_id', channelId)
    .select('id')
    .first();

  if (!allocatorChannel) {
    console.log(`Allocator channel ${channelId} not in database`);
    return;
  }

  await AllocatorChannel.query()
    .findById(allocatorChannel.id)
    .patch({ holdings: destinationHoldings.toHexString() });
}

export async function listen(eventCallback?: EventCallback) {
  Model.knex(knex);
  const adjudicator: ethers.Contract = await nitroAdjudicator();
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, async (channelId, amountDeposited, destinationHoldings) => {
    await onDeposit(channelId, amountDeposited, destinationHoldings);
    if (eventCallback) {
      eventCallback(EventType.Deposited);
    }
  });
  const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
  adjudicator.on(challengeCreatedFilter, (channelId, commitment, finalizedAt) => {
    console.log(`Challenge detected  with ${channelId} ${commitment} ${finalizedAt}`);
  });

  return () => {
    adjudicator.removeAllListeners(depositedFilter);
    adjudicator.removeAllListeners(challengeCreatedFilter);
  };
}

if (require.main === module) {
  listen();
}
