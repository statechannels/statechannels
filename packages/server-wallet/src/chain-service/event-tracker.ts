import {Event} from 'ethers';
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
  private blockNumber: number;
  private logIndex: number;
  private managedSubscriber: ChainEventSubscriberInterface;

  private isNewEvent(blockNumber: number, logIndex: number): boolean {
    this.logger.debug(`${blockNumber},${logIndex}:${this.blockNumber},${this.logIndex}`);
    if (blockNumber > this.blockNumber) {
      this.blockNumber = blockNumber;
      this.logIndex = logIndex;
      return true;
    } else if (blockNumber === this.blockNumber) {
      if (logIndex == Number.MAX_SAFE_INTEGER || logIndex > this.logIndex) {
        this.logIndex = logIndex;
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
    this.blockNumber = 0;
    this.logIndex = -1;
    this.logger = logger;
  }

  holdingUpdated(
    arg: HoldingUpdatedArg,
    blockNumber: number,
    logIndex: number = Number.MAX_SAFE_INTEGER
  ): void {
    if (this.isNewEvent(blockNumber, logIndex)) {
      this.managedSubscriber.holdingUpdated(arg);
      this.logger.debug(
        `EventTracker.holdingUpdated: Picked up event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    } else {
      this.logger.info(
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
    if (this.isNewEvent(blockNumber, logIndex)) {
      this.managedSubscriber.assetOutcomeUpdated(arg);
      this.logger.debug(
        `EventTracker.assetOutcomeUpdated: Picked up event (${blockNumber}, ${logIndex}): ` +
          JSON.stringify(arg)
      );
    } else {
      this.logger.info(
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
