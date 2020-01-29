import {ChannelProviderInterface} from '@statechannels/channel-provider';

import {
  ChannelClientInterface,
  ChannelResult,
  UnsubscribeFunction,
  Message,
  Participant,
  Allocation,
  PushMessageResult,
  SiteBudget
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
  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerDestinationAddress: string,
    hubAddress: string,
    hubDestinationAddress: string
  ): Promise<SiteBudget> {
    return this.provider.send('ApproveBudgetAndFund', {
      playerAmount,
      hubAmount,
      playerDestinationAddress,
      hubAddress,
      hubDestinationAddress
    });
  }

  async getBudget(hubAddress: string): Promise<SiteBudget> {
    return this.provider.send('GetBudget', {hubAddress});
  }

  onBudgetUpdated(callback: (result: SiteBudget) => void): UnsubscribeFunction {
    this.provider.on('BudgetUpdated', result => callback(result.params));
    return this.provider.off.bind(this, 'BudgetUpdated', callback);
  }
  async CloseAndWithdraw(hubAddress: string): Promise<SiteBudget> {
    return this.provider.send('CloseAndWithdraw', {hubAddress});
  }
  // async Withdraw(playerAmount: string, hubAmount: string, hubAddress: string) {
}
