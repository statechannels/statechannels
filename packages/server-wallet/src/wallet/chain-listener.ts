import {makeDestination} from '@statechannels/wallet-core';

import {ChainEventSubscriberInterface} from '../chain-service';
import {Engine} from '../engine';
import {MessageServiceInterface} from '../message-service/types';
import {getMessages} from '../message-service/utils';
import {Uint256} from '../type-aliases';

export function createChainListener(
  engine: Engine,
  messageService: MessageServiceInterface
): ChainEventSubscriberInterface {
  return {
    holdingUpdated: async ({channelId, amount, assetHolderAddress}) => {
      await engine.store.updateFunding(channelId, amount, assetHolderAddress);
      const result = await engine.crank([channelId]);
      await messageService.send(getMessages(result));
    },
    assetOutcomeUpdated: async ({channelId, assetHolderAddress, externalPayouts}) => {
      const transferredOut = externalPayouts.map(ai => ({
        toAddress: makeDestination(ai.destination),
        amount: ai.amount as Uint256,
      }));

      await engine.store.updateTransferredOut(channelId, assetHolderAddress, transferredOut);
      const result = await engine.crank([channelId]);
      await messageService.send(getMessages(result));
    },
    challengeRegistered: async ({channelId, finalizesAt: finalizedAt, challengeStates}) => {
      await engine.store.insertAdjudicatorStatus(channelId, finalizedAt, challengeStates);
      const result = await engine.crank([channelId]);
      await messageService.send(getMessages(result));
    },
    channelFinalized: async ({channelId, blockNumber, blockTimestamp, finalizedAt}) => {
      await engine.store.markAdjudicatorStatusAsFinalized(
        channelId,
        blockNumber,
        blockTimestamp,
        finalizedAt
      );
      const result = await engine.crank([channelId]);
      await messageService.send(getMessages(result));
    },
  };
}
