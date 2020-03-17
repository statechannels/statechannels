import {ChannelProviderInterface} from '@statechannels/channel-provider';

import {ChannelClientInterface, UnsubscribeFunction, Message} from './types';
import {
  PushMessageResult,
  ChannelResult,
  Allocation,
  Participant,
  SiteBudget
} from '@statechannels/client-api-schema';

type TokenAllocations = Allocation[];

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

  onBudgetUpdated(callback: (result: SiteBudget) => void): UnsubscribeFunction {
    this.provider.on('BudgetUpdated', result => callback(result.params));
    return this.provider.off.bind(this, 'BudgetUpdated', callback);
  }

  async createChannel(
    participants: Participant[],
    allocations: TokenAllocations,
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'CreateChannel',
      params: {
        participants,
        allocations,
        appDefinition,
        appData
      }
    });
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'JoinChannel', params: {channelId}});
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: TokenAllocations,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'UpdateChannel',
      params: {
        channelId,
        participants,
        allocations,
        appData
      }
    });
  }

  async getState(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'GetState', params: {channelId}});
  }

  async challengeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({
      method: 'ChallengeChannel',
      params: {
        channelId
      }
    });
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'CloseChannel', params: {channelId}});
  }

  async pushMessage(message: Message<ChannelResult>): Promise<PushMessageResult> {
    return this.provider.send({method: 'PushMessage', params: message});
  }

  async getAddress(): Promise<string> {
    return this.provider.send({method: 'GetAddress', params: {}});
  }

  async getEthereumSelectedAddress(): Promise<string> {
    return this.provider.send({method: 'GetEthereumSelectedAddress', params: {}});
  }

  async approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    playerOutcomeAddress: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<SiteBudget> {
    return this.provider.send({
      method: 'ApproveBudgetAndFund',
      params: {
        playerAmount,
        hubAmount,
        site: window.location.hostname,
        player: {
          participantId: await this.getAddress(),
          signingAddress: await this.getAddress(),
          destination: playerOutcomeAddress
        },
        hub: {
          participantId: hubAddress,
          signingAddress: hubAddress,
          destination: hubOutcomeAddress
        }
      }
    });
  }

  async getBudget(hubAddress: string): Promise<SiteBudget | {}> {
    return this.provider.send({method: 'GetBudget', params: {hubAddress}});
  }

  async closeAndWithdraw(hubAddress: string): Promise<SiteBudget | {}> {
    return this.provider.send({method: 'CloseAndWithdraw', params: {hubAddress}});
  }
}
