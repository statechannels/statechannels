import {Address} from '@statechannels/nitro-protocol/src/contract/types';
import {Logger} from 'pino';

import {
  HoldingUpdatedArg,
  AssetOutcomeUpdatedArg,
  ChannelFinalizedArg,
  ChallengeRegisteredArg,
  ChainEventSubscriberInterface,
} from './types';

export class EventTracker {
  private logger: Logger;
  private assetHolderMap: Map<Address, {blockNumber: number; logIndex: number}>;
  private managedSubscriber: ChainEventSubscriberInterface;

  private isNewEvent(assetHolderAddress: Address, blockNumber: number, logIndex: number): boolean {
    this.logger.debug(
      `return.isNewEvent: ${assetHolderAddress}, ${blockNumber}, ${logIndex}, ${JSON.stringify(
        this.assetHolderMap.get(assetHolderAddress) || {}
      )}`
    );
    if (!this.assetHolderMap.has(assetHolderAddress)) {
      this.assetHolderMap.set(assetHolderAddress, {blockNumber: blockNumber, logIndex: logIndex});
      return true;
    } else if (blockNumber > (this.assetHolderMap.get(assetHolderAddress)?.blockNumber || 0)) {
      this.assetHolderMap.set(assetHolderAddress, {blockNumber: blockNumber, logIndex: logIndex});
      return true;
    } else if (blockNumber == (this.assetHolderMap.get(assetHolderAddress)?.blockNumber || 0)) {
      if (logIndex > (this.assetHolderMap.get(assetHolderAddress)?.logIndex || 0)) {
        this.assetHolderMap.set(assetHolderAddress, {blockNumber: blockNumber, logIndex: logIndex});
        return true;
      } else {
        return false;
      }
    } else {
      return false;
    }
  }

  constructor(managedSubscriber: ChainEventSubscriberInterface, logger: Logger) {
    this.logger = logger;
    this.managedSubscriber = managedSubscriber;
    this.logger = logger;
    this.assetHolderMap = new Map<string, {blockNumber: number; logIndex: number}>();
  }

  holdingUpdated(
    arg: HoldingUpdatedArg,
    blockNumber: number,
    logIndex: number = Number.MAX_SAFE_INTEGER
  ): void {
    if (this.isNewEvent(arg.assetHolderAddress, blockNumber, logIndex)) {
      this.managedSubscriber.holdingUpdated(arg);
      this.logger.debug(
        `EventTracker.holdingUpdated: Picked up event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    } else {
      this.logger.debug(
        `EventTracker.holdingUpdated: Discarded event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    }
  }
  assetOutcomeUpdated(
    arg: AssetOutcomeUpdatedArg,
    blockNumber: number,
    logIndex: number = Number.MAX_SAFE_INTEGER
  ): void {
    if (this.isNewEvent(arg.assetHolderAddress, blockNumber, logIndex)) {
      this.managedSubscriber.assetOutcomeUpdated(arg);
      this.logger.debug(
        `EventTracker.assetOutcomeUpdated: Picked up event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    } else {
      this.logger.debug(
        `EventTracker.assetOutcomeUpdated: Discarded event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    }
  }

  channelFinalized(arg: ChannelFinalizedArg): void {
    this.managedSubscriber.channelFinalized(arg);
  }
  challengeRegistered(arg: ChallengeRegisteredArg): void {
    this.managedSubscriber.challengeRegistered(arg);
  }
}
