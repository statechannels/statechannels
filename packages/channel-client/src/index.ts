import {BigNumberish} from 'ethers/utils';

export type ChannelStatus = 'proposed' | 'opening' | 'funding' | 'running' | 'closing' | 'closed';

export enum ErrorCodes {
  SIGNING_ADDRESS_NOT_FOUND = 1000,
  INVALID_APP_DEFINITION = 1001,
  INVALID_APP_DATA = 1002,
  UNSUPPORTED_TOKEN = 1003,
  CHANNEL_NOT_FOUND = 1004
}

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: string; // Address used to sign channel updates
  destination: string; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: string; // Address of EOA to receive channel proceeds.
  amount: BigNumberish; // How much funds will be transferred to the destination address.
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

type UnsubscribeFunction = () => void;

export interface PushMessageResult {
  success: boolean;
}

// The message Payload is designed to be opaque to the app. However, it's useful
// to be able to specify the Payload type for the FakeChannelClient, as we'll be
// manipulating it within the client.
export interface ChannelClientInterface<Payload = object> {
  onMessageQueued: (callback: (message: Message<Payload>) => void) => UnsubscribeFunction;
  onChannelUpdated: (callback: (result: ChannelResult) => void) => UnsubscribeFunction;
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

// TODO: Implement this
// export default class ChannelClient implements ChannelClientInterface<ChannelResult> {}
