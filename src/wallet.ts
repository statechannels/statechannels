import { Message } from '@statechannels/wallet-core';

import {
  Allocation,
  AllocationItem,
  CreateChannelParams,
  UpdateChannelParams as ClientUpdateChannelParams,
  ChannelStatus,
  ChannelResult as ClientChannelResult,
  Notification,
} from '@statechannels/client-api-schema';

// TODO: participants should be removed from ClientUpdateChannelParams
export type UpdateChannelParams = Omit<
  ClientUpdateChannelParams,
  'participants'
>;
export { ChannelStatus, CreateChannelParams };

type AddressedMessage = Message & { to: string; from: string };

// TODO: The client-api does not currently allow for outgoing messages to be
// declared as the result of a wallet API call.
// This is an interim type, until it does.
type WithOutbox = { outbox?: AddressedMessage[] };
type ChannelResult = ClientChannelResult & WithOutbox;

// TODO: The client api is not fully developed around ledger channels
// This is an interim type, until it is.
type LedgerResult = WithOutbox & {
  hub: string;
  hubCapacity: AllocationItem;
  myCapacity: AllocationItem;
  locked: Allocation[];
  channelId: Bytes32;
  status: ChannelStatus;
  turnNum: Uint48;
  challengeExpirationTime?: Uint48;
};

export type WalletInterface = {
  createAndFundLedger(allocations: Allocation[]): Promise<LedgerResult>;
  closeLedgerAndWithdraw(): Promise<LedgerResult>;

  // App channel management
  updateChannel(args: UpdateChannelParams): Promise<ChannelResult>;
  createChannel(args: CreateChannelParams): Promise<ChannelResult>;
  joinChannel(channelId: Bytes32): Promise<ChannelResult>;
  getChannels(): Promise<ClientChannelResult[]>;
  closeChannel(channelId: Bytes32): Promise<ChannelResult>;

  // Wallet <-> Wallet communication
  pushMessage(
    m: AddressedMessage
  ): Promise<{ response?: Message; channelResult: ChannelResult }>;

  // Wallet -> App communication
  onNotification(cb: (notice: Notification) => void): { unsubscribe: any };
};
