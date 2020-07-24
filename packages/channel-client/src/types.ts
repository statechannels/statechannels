import {
  ChannelResult,
  DomainBudget,
  Message,
  ErrorCodes,
  Allocation,
  PushMessageResult,
  Participant,
  FundingStrategy
} from '@statechannels/client-api-schema';
import {ChannelProviderInterface} from '@statechannels/iframe-channel-provider';
import {ReplaySubject} from 'rxjs';

/**
 * @beta
 */
export type TokenAllocations = Allocation[];

/**
 * @beta
 */
export type UnsubscribeFunction = () => void;

/**
 * @beta
 */
export interface ChannelClientInterface {
  /*
    Queuing a message is meant for when the app receives messages from
    the wallet meant for the opponent's app (and hence the opponent's wallet).
  */
  onMessageQueued: (callback: (message: Message) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  onChannelProposed: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;

  provider: ChannelProviderInterface;
  channelState: ReplaySubject<ChannelResult>;
  walletVersion?: string;
  signingAddress?: string;
  destinationAddress?: string;

  /*
    Pushing a message is meant for when the app receives a message from
    the opponent's app meant for the wallet.
  */
  pushMessage: (message: Message) => Promise<PushMessageResult>;
  createChannel: (
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string,
    fundingStrategy: FundingStrategy
  ) => Promise<ChannelResult>;
  joinChannel: (channelId: string) => Promise<ChannelResult>;
  updateChannel: (
    channelId: string,
    allocations: Allocation[],
    appData: string
  ) => Promise<ChannelResult>;
  getState: (channelId: string) => Promise<ChannelResult>;
  challengeChannel: (channelId: string) => Promise<ChannelResult>;
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  getChannels(includeClosed: boolean): Promise<ChannelResult[]>;
}

/**
 * @beta
 */
export interface BrowserChannelClientInterface extends ChannelClientInterface {
  onBudgetUpdated: (callback: (result: DomainBudget) => void) => UnsubscribeFunction;
  approveBudgetAndFund(
    playerAmount: string,
    hubAmount: string,
    hubAddress: string,
    hubOutcomeAddress: string
  ): Promise<DomainBudget>;
  closeAndWithdraw(hubParticipantId: string): Promise<DomainBudget | {}>;
  getBudget(hubAddress: string): Promise<DomainBudget | {}>;
}

export interface EventsWithArgs {
  MessageQueued: [Message];
  ChannelUpdated: [ChannelResult];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

/**
 * @beta
 */
export const ErrorCode: ErrorCodes = {
  EnableEthereum: {EthereumNotEnabled: 100},
  CloseAndWithdraw: {UserDeclined: 200},
  CloseChannel: {
    NotYourTurn: 300,
    ChannelNotFound: 301
  },
  UpdateChannel: {
    ChannelNotFound: 400,
    InvalidTransition: 401,
    InvalidAppData: 402,
    NotYourTurn: 403,
    ChannelClosed: 404
  }
};
