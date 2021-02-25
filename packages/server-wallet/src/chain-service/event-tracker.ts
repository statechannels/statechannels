import {
  HoldingUpdatedArg,
  AssetOutcomeUpdatedArg,
  ChannelFinalizedArg,
  ChallengeRegisteredArg,
  ChainEventSubscriberInterface,
} from './types';

export class EventTracker {
  private blockNumber: number;
  private managedSubscriber: ChainEventSubscriberInterface;

  constructor(managedSubscriber: ChainEventSubscriberInterface) {
    this.managedSubscriber = managedSubscriber;
    this.blockNumber = 0;
  }

  holdingUpdated(arg: HoldingUpdatedArg, blockNumber: number): void {
    if (blockNumber >= this.blockNumber) {
      this.managedSubscriber.holdingUpdated(arg);
      this.blockNumber = blockNumber;
    }
  }
  assetOutcomeUpdated(arg: AssetOutcomeUpdatedArg, blockNumber: number): void {
    if (blockNumber >= this.blockNumber) {
      this.managedSubscriber.assetOutcomeUpdated(arg);
      this.blockNumber = blockNumber;
    }
  }

  channelFinalized(arg: ChannelFinalizedArg): void {
    this.managedSubscriber.channelFinalized(arg);
  }
  challengeRegistered(arg: ChallengeRegisteredArg): void {
    this.managedSubscriber.challengeRegistered(arg);
  }
}
