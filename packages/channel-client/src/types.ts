export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

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
  // funding: Funds[]; // do we even need this?
  turnNum: string;
}

export type UnsubscribeFunction = () => void;

export interface PushMessageResult {
  success: boolean;
}

// The message Payload is designed to be opaque to the app. However, it's useful
// to be able to specify the Payload type for the FakeChannelClient, as we'll be
// manipulating it within the client.
export interface ChannelClientInterface<Payload = object> {
  onMessageQueued: (callback: (message: Message<Payload>) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
  onChannelProposed: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
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
  closeChannel: (channelId: string) => Promise<ChannelResult>;
  pushMessage: (message: Message<Payload>) => Promise<PushMessageResult>;
  getAddress: () => Promise<string>;
}
