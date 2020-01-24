import {ChannelProviderInterface} from '@statechannels/channel-provider';

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
  constructor(private readonly provider: ChannelProviderInterface) {}

  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    this.provider.on('MessageQueued', callback);
    return this.provider.off.bind(this, 'MessageQueued', callback);
  }

  onChannelUpdated(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.provider.on('ChannelUpdated', result => callback(result.params));
    return this.provider.off.bind(this, 'ChannelUpdated', callback);
  }

  onChannelProposed(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.provider.on('ChannelProposed', result => callback(result.params));
    return this.provider.off.bind(this, 'ChannelProposed', callback);
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

  async challengeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('ChallengeChannel', {
      channelId
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
