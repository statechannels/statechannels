import {Logger} from 'pino';

import {
  HoldingUpdatedArg,
  AssetOutcomeUpdatedArg,
  ChannelFinalizedArg,
  ChallengeRegisteredArg,
  ChainEventSubscriberInterface,
} from './types';

/**
 * This class is a wrapper of ChainEventSubscriberInterface.
 * Purpose - 2 functions can trigger AssetHolder events to be played to ChainEventSubscriberInterface
 *    1. chainservice.getInitialHoldings
 *    2. chainservice.addAssetHolderObservable
 * Some events can be played twice by both functions, order not predictable,
 * this class ensures each event is played once and in the right order
 */
export class EventTracker {
  private logger: Logger;
  private blockNumber = 0;
  private logIndex = 0;
  private managedSubscriber: ChainEventSubscriberInterface;

  constructor(managedSubscriber: ChainEventSubscriberInterface, logger: Logger) {
    this.logger = logger;
    this.managedSubscriber = managedSubscriber;
    this.logger = logger;
  }

  private isNewEvent(blockNumber: number, logIndex: number): boolean {
    this.logger.debug(
      `EventTracker.isNewEvent: ${blockNumber}, ${logIndex}, ${this.blockNumber}, ${this.logIndex}`
    );

    let isNew = false;
    if (this.blockNumber == 0 && this.logIndex == 0) {
      isNew = true;
    } else if (blockNumber > this.blockNumber) {
      isNew = true;
    } else if (blockNumber === this.blockNumber) {
      if (logIndex > this.logIndex) {
        isNew = true;
      }
    }

    if (isNew) {
      // Save latest event ever seen
      this.logger.debug('Event is new');
      return true;
    } else {
      this.logger.debug('Event is not new');
      return false;
    }
  }

  // Pass event to managed subscriber only if new
  holdingUpdated(
    arg: HoldingUpdatedArg,
    blockNumber: number,
    logIndex: number = Number.MAX_SAFE_INTEGER // Why default to max: getInitialHoldings can call this without logIndex,
    // in which case should be considered the latest balance in block
  ): void {
    if (this.isNewEvent(blockNumber, logIndex)) {
      this.managedSubscriber.holdingUpdated(arg);
    }
  }

  // Pass event to managed subscriber only if new
  assetOutcomeUpdated(arg: AssetOutcomeUpdatedArg, blockNumber: number, logIndex: number): void {
    if (this.isNewEvent(blockNumber, logIndex)) {
      this.managedSubscriber.assetOutcomeUpdated(arg);
    }
  }

  // This event is not from AssetHolder so no check needed
  channelFinalized(arg: ChannelFinalizedArg): void {
    this.managedSubscriber.channelFinalized(arg);
  }

  // This event is not from AssetHolder so no check needed
  challengeRegistered(arg: ChallengeRegisteredArg): void {
    this.managedSubscriber.challengeRegistered(arg);
  }
}
