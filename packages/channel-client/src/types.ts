import {
  PushMessageResult,
  CreateChannelResult,
  JoinChannelResult,
  UpdateChannelResult,
  CloseChannelResult,
  Participant,
  TokenAllocations
} from '@statechannels/client-api-schema';

// TODO: Several of these types are duplicates of those in @statechannels/client-api-schema

export type ChannelStatus =
  | 'proposed'
  | 'opening'
  | 'funding'
  | 'running'
  | 'challenging'
  | 'responding'
  | 'closing'
  | 'closed';

export interface Message<T = object> {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: T; // Message payload. Format defined by wallet and opaque to app.
  // But useful to be able to specify, for the purposes of the fake-client
}

export interface Funds {
  token: string;
  amount: string;
}

export type ChannelResult =
  | CreateChannelResult
  | JoinChannelResult
  | UpdateChannelResult
  | CloseChannelResult;

export type UnsubscribeFunction = () => void;

// The message Payload is designed to be opaque to the app. However, it's useful
// to be able to specify the Payload type for the FakeChannelClient, as we'll be
// manipulating it within the client.
export interface ChannelClientInterface<Payload = object> {
  /*
    Queuing a message is meant for when the app receives messages from
    the wallet meant for the opponent's app (and hence the opponent's wallet).
  */
  onMessageQueued: (callback: (message: Message<Payload>) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  onChannelProposed: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  /*
    Pushing a message is meant for when the app receives a message from
    the opponent's app meant for the wallet.
  */
  pushMessage: (message: Message<Payload>) => Promise<PushMessageResult>;
  createChannel: (
    participants: Participant[],
    allocations: TokenAllocations,
    appDefinition: string,
    appData: string
  ) => Promise<ChannelResult>;
  joinChannel: (channelId: string) => Promise<ChannelResult>;
  updateChannel: (
    channelId: string,
    participants: Participant[],
    allocations: TokenAllocations,
    appData: string
  ) => Promise<ChannelResult>;
  challengeChannel: (channelId: string) => Promise<ChannelResult>;
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  getAddress: () => Promise<string>;
}
interface Balance {
  playerAmount: string;
  hubAmount: string;
}
export interface SiteBudget {
  site: string;
  hub: string;
  pending: Balance;
  free: Balance;
  inUse: Balance;
  direct: Balance;
}
export interface EventsWithArgs {
  MessageQueued: [Message<ChannelResult>];
  ChannelUpdated: [ChannelResult];
  BudgetUpdated: [SiteBudget];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

type UnsubscribeFunction = () => void;
