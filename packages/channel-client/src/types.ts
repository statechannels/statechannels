import {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcNotification
} from '@statechannels/channel-provider';

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

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: string; // Address used to sign channel updates
  destination: string; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: string; // Address of EOA to receive channel proceeds.
  amount: string; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  token: string; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

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

export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: string;
  channelId: string;
  status: ChannelStatus;
  turnNum: string;
  challengeExpirationTime?: number;
}

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
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ) => Promise<ChannelResult>;
  joinChannel: (channelId: string) => Promise<ChannelResult>;
  updateChannel: (
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ) => Promise<ChannelResult>;
  challengeChannel: (channelId: string) => Promise<ChannelResult>;
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  getAddress: () => Promise<string>;
}

export interface EventsWithArgs {
  MessageQueued: [Message<ChannelResult>];
  ChannelUpdated: [ChannelResult];
  // TODO: Is `ChannelResult` the right type to use here?
  ChannelProposed: [ChannelResult];
}

type UnsubscribeFunction = () => void;

export interface CreateChannelParameters {
  participants: Participant[];
  allocations: Allocation[];
  appDefinition: string;
  appData: string;
}

export interface UpdateChannelParameters {
  channelId: string;
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
}

export type GetAddressRequest = JsonRpcRequest<'GetAddress', {}>; // todo: what are params

export type CreateChannelRequest = JsonRpcRequest<'CreateChannel', CreateChannelParameters>;

export type CreateChannelResponse = JsonRpcResponse<ChannelResult>;

export interface JoinChannelParameters {
  channelId: string;
}

export type JoinChannelRequest = JsonRpcRequest<'JoinChannel', JoinChannelParameters>;

export type JoinChannelResponse = JsonRpcResponse<ChannelResult>;

export type UpdateChannelRequest = JsonRpcRequest<'UpdateChannel', UpdateChannelParameters>;

export type PushMessageRequest = JsonRpcRequest<'PushMessage', Message>;

export interface PushMessageResult {
  success: boolean;
}

export type PushMessageResponse = JsonRpcResponse<PushMessageResult>;

export interface CloseChannelParameters {
  channelId: string;
}
export type CloseChannelRequest = JsonRpcRequest<'CloseChannel', CloseChannelParameters>;
export type CloseChannelResponse = JsonRpcResponse<ChannelResult>;

export type ChannelProposedNotification = JsonRpcNotification<'ChannelProposed', ChannelResult>;
export type ChannelUpdatedNotification = JsonRpcNotification<'ChannelUpdated', ChannelResult>;
export type ChannelClosingNotification = JsonRpcNotification<'ChannelClosed', ChannelResult>;

export type MessageQueuedNotification = JsonRpcNotification<'MessageQueued', Message>;

export type Notification =
  | ChannelProposedNotification
  | ChannelUpdatedNotification
  | ChannelClosingNotification
  | MessageQueuedNotification;

export type NotificationName = Notification['method'];

export type Request =
  | GetAddressRequest
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | PushMessageRequest
  | CloseChannelRequest;

export type NotificationType = 'ChannelProposed' | 'ChannelUpdate' | 'MessageQueued';
