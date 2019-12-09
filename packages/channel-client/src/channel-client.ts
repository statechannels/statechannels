import {IChannelProvider} from '@statechannels/channel-provider';

import {
  ChannelClientInterface,
  ChannelResult,
  UnsubscribeFunction,
  Message,
  Participant,
  Allocation,
  PushMessageResult
} from './types';

export class ChannelClient implements ChannelClientInterface<ChannelResult> {
  constructor(private readonly provider: IChannelProvider) {}

  // TODO: Ask Tom if this needs to be a synchronous function
  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    let unsubscribe = (): void => {
      throw new Error('Subscription has not been confirmed yet!');
    };

    this.provider.subscribe('not sure what goes here 1').then(subscriptionId => {
      this.provider.on('MessageQueued', callback);
      unsubscribe = (): void => {
        this.provider.unsubscribe(subscriptionId);
      };
    });

    return (): void => {
      unsubscribe();
    };
  }

  // TODO: Ask Tom if this needs to be a synchronous function
  onChannelUpdated(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    let unsubscribe = (): void => {
      throw new Error('Subscription has not been confirmed yet!');
    };

    this.provider.subscribe('not sure what goes here 2').then(subscriptionId => {
      this.provider.on('ChannelUpdated', callback);
      unsubscribe = (): void => {
        this.provider.unsubscribe(subscriptionId);
      };
    });

    return (): void => {
      unsubscribe();
    };
  }

  async createChannel(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send('CreateChannel', {
      participants,
      allocations,
      appDefinition,
      appData
    });
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('JoinChannel', {channelId});
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send('UpdateChannel', {
      channelId,
      participants,
      allocations,
      appData
    });
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('CloseChannel', {channelId});
  }

  async pushMessage(message: Message<ChannelResult>): Promise<PushMessageResult> {
    return this.provider.send('PushMessage', message);
  }

  async getAddress(): Promise<string> {
    return this.provider.send('GetAddress', {});
  }
}
