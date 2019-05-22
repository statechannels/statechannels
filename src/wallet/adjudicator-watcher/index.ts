import { ethers } from 'ethers';
import { BigNumber } from 'ethers/utils';
import { nitroAdjudicator } from '../utilities/blockchain';

/**
 * todos:
 * - wire up then other events.
 */

export enum AdjudicaorWatcherEventType {
  Deposited,
  ChallengeCreated,
}

export interface AdjudicatorWatcherEvent {
  eventType: AdjudicaorWatcherEventType;
  channelId: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

export async function listen() {
  console.log('adjudicator-watcher: listen');
  const adjudicator: ethers.Contract = await nitroAdjudicator();
  const depositedFilter = adjudicator.filters.Deposited();
  adjudicator.on(depositedFilter, async (channelId, amountDeposited, destinationHoldings) => {
    process.send({
      eventType: AdjudicaorWatcherEventType.Deposited,
      channelId,
      amountDeposited,
      destinationHoldings,
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
