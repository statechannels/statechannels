import { ethers } from 'ethers';
import { Uint256 } from 'fmg-core';
import { nitroAdjudicator } from '../utilities/blockchain';

/**
 * todos:
 * - wire up then other events.
 */

export enum AdjudicatorWatcherEventType {
  Deposited,
  ChallengeCreated,
}

export interface AdjudicatorWatcherEvent {
  eventType: AdjudicatorWatcherEventType;
  channelId: string;
  amountDeposited: Uint256;
  destinationHoldings: Uint256;
}

export async function listen() {
  console.log('adjudicator-watcher: listen');
  const adjudicator: ethers.Contract = await nitroAdjudicator();
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, async (channelId, amountDeposited, destinationHoldings) => {
    process.send({
      eventType: AdjudicatorWatcherEventType.Deposited,
      channelId,
      amountDeposited: amountDeposited.toHexString(),
      destinationHoldings: destinationHoldings.toHexString(),
    });
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
