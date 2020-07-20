import {ChannelProviderInterface} from '@statechannels/channel-provider';
import {
  PushMessageResult,
  ChannelResult,
  Allocation,
  Participant,
  DomainBudget,
  ChannelUpdatedNotification,
  ChannelProposedNotification,
  BudgetUpdatedNotification,
  Message,
  MessageQueuedNotification,
  FundingStrategy
} from '@statechannels/client-api-schema';
import {ReplaySubject} from 'rxjs';

import {ETH_TOKEN_ADDRESS} from '../tests/constants';

import {ChannelClientInterface, UnsubscribeFunction} from './types';
import {HUB} from './constants';

type TokenAllocations = Allocation[];

export class ChannelClient implements ChannelClientInterface {
  channelState: ReplaySubject<ChannelResult>;
  get signingAddress(): string | undefined {
    return this.provider.signingAddress;
  }

  get destinationAddress(): string | undefined {
    return this.provider.destinationAddress;
  }

  get walletVersion(): string | undefined {
    return this.provider.walletVersion;
  }

  constructor(readonly provider: ChannelProviderInterface) {
    this.channelState = new ReplaySubject(1);
    this.provider.on('ChannelUpdated', result => this.channelState.next(result));
  }

  onMessageQueued(
    callback: (result: MessageQueuedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('MessageQueued', callback);
    return (): void => {
      this.provider.off('MessageQueued', callback);
    };
  }

  onChannelUpdated(
    callback: (result: ChannelUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    return this.channelState.subscribe(callback).unsubscribe;
  }

  onChannelProposed(
    callback: (result: ChannelProposedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('ChannelProposed', callback);
    return (): void => {
      this.provider.off('ChannelProposed', callback);
    };
  }

  onBudgetUpdated(
    callback: (result: BudgetUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('BudgetUpdated', callback);
    return (): void => {
      this.provider.off('BudgetUpdated', callback);
    };
  }
  async getChannels(includeClosed: boolean): Promise<ChannelResult[]> {
    return this.provider.send({method: 'GetChannels', params: {includeClosed}});
  }

  async createChannel(
    participants: Participant[],
    allocations: TokenAllocations,
    appDefinition: string,
    appData: string,
    fundingStrategy: FundingStrategy
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'CreateChannel',
      params: {
        participants,
        allocations,
        appDefinition,
        appData,
        fundingStrategy
      }
    });
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send({method: 'JoinChannel', params: {channelId}});
  }

  async updateChannel(
    channelId: string,
    allocations: TokenAllocations,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send({
      method: 'UpdateChannel',
      params: {
        channelId,
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

  async pushMessage(message: Message): Promise<PushMessageResult> {
    return this.provider.send({method: 'PushMessage', params: message});
  }

  async approveBudgetAndFund(
    receiveCapacity: string,
    sendCapacity: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<DomainBudget> {
    return this.provider.send({
      method: 'ApproveBudgetAndFund',
      params: {
        requestedReceiveCapacity: receiveCapacity,
        requestedSendCapacity: sendCapacity,
        token: ETH_TOKEN_ADDRESS,
        playerParticipantId: this.signingAddress as string,

        hub: {
          participantId: HUB.participantId,
          signingAddress: hubAddress,
          destination: hubOutcomeAddress
        }
      }
    });
  }

  async getBudget(hubAddress: string): Promise<DomainBudget> {
    return this.provider.send({method: 'GetBudget', params: {hubAddress}});
  }

  async closeAndWithdraw(hubParticipantId: string): Promise<DomainBudget> {
    return this.provider.send({
      method: 'CloseAndWithdraw',
      params: {
        hubParticipantId
      }
    });
  }
}
