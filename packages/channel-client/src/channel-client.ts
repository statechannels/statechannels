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

import {UnsubscribeFunction} from './types';
import {HUB} from './constants';

type TokenAllocations = Allocation[];

/**
 * @beta
 * Class that wraps the channel-provider's JSON-RPC interface and exposes a more convenient API
 */
export class ChannelClient {
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
  /**
   * Registers a callback that will fire when an outbound message is ready to be dispatched.
   *
   * @remarks
   * This method should be hooked up to your applications's messaging layer.
   *
   * @param callback - An function that accepts a MessageQueuedNotification.
   * @returns A function that will unregister the callback when invoked
   *
   */
  onMessageQueued(
    callback: (result: MessageQueuedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('MessageQueued', callback);
    return (): void => {
      this.provider.off('MessageQueued', callback);
    };
  }

  /**
   * Registers a callback that will fire when a state channel is updated.
   *
   * @param callback - A function that accepts a ChannelUpdatedNotification.
   * @returns A function that will unregister the callback when invoked.
   *
   */
  onChannelUpdated(
    callback: (result: ChannelUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    return this.channelState.subscribe(callback).unsubscribe;
  }

  /**
   * Registers a callback that will fire when a state channel is proposed.
   *
   * @param callback - A function that accepts a ChannelProposedNotification.
   * @returns A function that will unregister the callback when invoked.
   *
   */
  onChannelProposed(
    callback: (result: ChannelProposedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('ChannelProposed', callback);
    return (): void => {
      this.provider.off('ChannelProposed', callback);
    };
  }

  /**
   * Registers callback that will fire when a site budget is updated.
   *
   * @param callback - A function that accepts a BudgetUpdatedNotification.
   * @returns A function that will unregister the callback when invoked.
   *
   */
  onBudgetUpdated(
    callback: (result: BudgetUpdatedNotification['params']) => void
  ): UnsubscribeFunction {
    this.provider.on('BudgetUpdated', callback);
    return (): void => {
      this.provider.off('BudgetUpdated', callback);
    };
  }

  /**
   * Requests the latest state for all channels.
   *
   * @param includeClosed - If true, closed channels will be included in the response.
   * @returns A promise that resolves to an array of ChannelResults.
   *
   */
  async getChannels(includeClosed: boolean): Promise<ChannelResult[]> {
    return this.provider.send('GetChannels', {includeClosed});
  }

  /**
   * Requests a new channel to be created
   *
   * @param participants - Array of Participants for this channel
   * @param allocations - Initial allocation of funds for this channel
   * @param appDefinition - Address of ForceMoveApp deployed on chain
   * @param appData - Initial application data for this channel
   * @param fundingStrategy - Direct, Ledger or Virtual funding
   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async createChannel(
    participants: Participant[],
    allocations: TokenAllocations,
    appDefinition: string,
    appData: string,
    fundingStrategy: FundingStrategy
  ): Promise<ChannelResult> {
    return this.provider.send('CreateChannel', {
      participants,
      allocations,
      appDefinition,
      appData,
      fundingStrategy
    });
  }

  /**
   * Join a proposed state channel
   *
   * @param channelId - id for the state channel

   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async joinChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('JoinChannel', {channelId});
  }

  /**
   * Updates the state of a channel
   *
   * @param channelId - id for the state channel
   * @param allocations - Updated allocation of funds for this channel
   * @param appData - Updated application data for this channel
   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async updateChannel(
    channelId: string,
    allocations: TokenAllocations,
    appData: string
  ): Promise<ChannelResult> {
    return this.provider.send('UpdateChannel', {
      channelId,
      allocations,
      appData
    });
  }

  /**
   * Requests the latest state for a channel
   *
   * @param channelId - id for the state channel
   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async getState(channelId: string): Promise<ChannelResult> {
    return this.provider.send('GetState', {channelId});
  }

  /**
   * Requests a challenge for a channel
   *
   * @param channelId - id for the state channel
   * @returns A promise that resolves to a ChannelResult.
   *
   * @beta
   */
  async challengeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('ChallengeChannel', {
      channelId
    });
  }

  /**
   * Requests a close for a channel
   *
   * @param channelId - id for the state channel
   * @returns A promise that resolves to a ChannelResult.
   *
   * @beta
   */
  async closeChannel(channelId: string): Promise<ChannelResult> {
    return this.provider.send('CloseChannel', {channelId});
  }

  /**
   * Accepts inbound messages from other state channel participants.
   *
   * @remarks
   * This method should be hooked up to your applications's messaging layer.
   *
   * @param message - An inbound message.
   * @param y - The second input number
   * @returns A promise that resolves to a PushMessageResult
   *
   */
  async pushMessage(message: Message): Promise<PushMessageResult> {
    return this.provider.send('PushMessage', message);
  }

  /**
   * Requests approval for a new budget for this domain, as well as for an appropriately funded ledger channel with the hub
   * @param receiveCapacity -  Amount for me in the ledger channel
   * @param sendCapacity - Amount for the hub in the ledger channel
   * @param hubAddress - Address for the hub,
   * @param hubOutcomeAddress - Ethereum account for the hub
   * @returns A promise that resolves to a DomainBudget
   *
   */
  async approveBudgetAndFund(
    receiveCapacity: string,
    sendCapacity: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<DomainBudget> {
    return this.provider.send('ApproveBudgetAndFund', {
      requestedReceiveCapacity: receiveCapacity,
      requestedSendCapacity: sendCapacity,
      token: ETH_TOKEN_ADDRESS,
      playerParticipantId: this.signingAddress as string,
      hub: {
        participantId: HUB.participantId,
        signingAddress: hubAddress,
        destination: hubOutcomeAddress
      }
    });
  }

  /**
   * Requests the latest budget for this site
   *
   * @param hubParticipantId - The id of a state channel hub
   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async getBudget(hubParticipantId: string): Promise<DomainBudget | {}> {
    return this.provider.send('GetBudget', {hubParticipantId});
  }

  /**
   * Requests the funds to be withdrawn from this site's ledger channel
   *
   * @param hubAddress - The address of a state channel hub
   * @param hubOutcomeAddress - An ethereum account that the hub's funds will be paid out to TODO this doesn't make sense
   * @returns A promise that resolves to a DomainBudget.
   *
   */
  async closeAndWithdraw(hubParticipantId: string): Promise<DomainBudget | {}> {
    return this.provider.send('CloseAndWithdraw', {
      hubParticipantId
    });
  }
}
