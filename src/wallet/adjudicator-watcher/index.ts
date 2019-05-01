import { ethers } from 'ethers';
import { Model } from 'objection';
import knex from '../db/connection';
import AllocatorChannel from '../models/allocatorChannel.js';
import { nitroAdjudicator } from '../utilities/blockchain.js';

/**
 * todos:
 * - define database schema for the adjudicator state: maybe use allocator channels for now
 * - update state when a notification arrives.
 * - test state update.
 * */

async function start() {
  console.log('Starting chain watcher');
  const adjudicator: ethers.Contract = await nitroAdjudicator();
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, async (channelId, amountDeposited, destinationHoldings) => {
    // todo: update the database
    console.log(`Deposit detected  with ${amountDeposited} ${destinationHoldings} ${channelId}`);

    // 1. Check that the channel exists in the database
    // 2. Update the DB
    const allocator_channel = await AllocatorChannel.query()
      .where({ channel_id: channelId })
      .select('id')
      .first();
    if (!allocator_channel) {
      console.log(`Allocator channel ${channelId} not in database`);
      return;
    }

    await AllocatorChannel.query()
      .patch({ holdings: destinationHoldings })
      .where({ id: allocator_channel.id });
  });

  console.log('Adding challenge watcher');
  const challengeCreatedFilter = adjudicator.filters.ChallengeCreated();
  adjudicator.on(challengeCreatedFilter, (channelId, commitment, finalizedAt) => {
    console.log(`Deposit detected  with ${channelId} ${commitment} ${finalizedAt}`);
  });
}

Model.knex(knex);
start();
