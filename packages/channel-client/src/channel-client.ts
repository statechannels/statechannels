import {ChannelProviderInterface} from '@statechannels/iframe-channel-provider';
import {
  PushMessageResult,
  ChannelResult,
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

import {BrowserChannelClientInterface, UnsubscribeFunction, TokenAllocations} from './types';
import {HUB} from './constants';
/**
 * Class that wraps the JSON-RPC interface of \@statechannels/iframe-channel-provider
 *
 * @remarks
 * This class exposes a convenient API feturing event emitters and async methods returning Promises.
 * Together with \@statechannels/iframe-channel-provider, it allows a Dapp to speak to the statechannels wallet.
 *
 * @beta
 */

export class ChannelClient implements BrowserChannelClientInterface {
  /**
   *  E.g. instance of the \@statechannels/iframe-channel-provider class, suitably configured
   */
  readonly provider: ChannelProviderInterface;

  /**
   * rxjs Observable which emits ChannelResults for all channels of interest
   */
  channelState: ReplaySubject<ChannelResult>;

  /**
   * Get my state channel (ephemeral) signingAddress
   */
  get signingAddress(): string | undefined {
    return this.provider.signingAddress;
  }
  /**
   * Get my destination address
   *
   * @remarks
   * E.g. an address in MetaMask / other Ethereum wallet
   */
  get destinationAddress(): string | undefined {
    return this.provider.destinationAddress;
  }
  /**
   * Get the wallet version
   */
  get walletVersion(): string | undefined {
    return this.provider.walletVersion;
  }

  /**
   * Create a new instance of the Channel Client
   *
   * @remarks
   * It is possible to pass in a {@link @statechannels/channel-client#FakeChannelProvider | fake channel provider},
   * which simulates the behaviour of a wallet without requiring an iframe or browser. Useful for development.
   *
   * @param provider - An instance of the \@statechannels/iframe-channel-provider class, suitably configured
   */
  constructor(provider: ChannelProviderInterface) {
    this.provider = provider;
    this.channelState = new ReplaySubject(1);
    this.provider.on('ChannelUpdated', (result: ChannelResult) => this.channelState.next(result));
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
   * @remarks 
   * 
   * Triggered when any of the following occurs:
   * 
   * * A state is received via `updateChannel`
   * * A state is received from another participant via `pushMessage`
   * * Changes to the state of the blockchain are detected (e.g funding or challenges)
   * 
   * In the first two cases, this notification is only triggered when the wallet verifies that the state causes the 'top state' to change.
   * 
   * The 'top state' is the state drawn from the set of **supported** states that has the highest turn number.
   * 
   * (We have glossed over / left undefined what happens in the case where there is more than one top state).
   * 
   * In particular, this means that
   * 
   * * incorrectly formatted
   * * incorrectly signed
   * * otherwise unsupported
   * * out-of-date
   * 
   * states will not trigger this notification. Similarly, a countersignature on an already-supported state will not trigger this notification _unless_ it means that a conclusion proof is now available.
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
   * Registers callback that will fire when a domain budget is updated.
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
   * Requests the latest budget for this domain
   *
   * @param hubParticipantId - The id of a state channel hub
   * @returns A promise that resolves to a ChannelResult.
   *
   */
  async getBudget(hubParticipantId: string): Promise<DomainBudget | {}> {
    return this.provider.send('GetBudget', {hubParticipantId});
  }

  /**
   * Requests the funds to be withdrawn from this domain's ledger channel
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
