import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  CloseChannelParams,
  GetStateParams,
  ChannelId,
  ChannelResult,
} from '@statechannels/client-api-schema';
import {Participant, Address as CoreAddress} from '@statechannels/wallet-core';

import {Outgoing} from '../protocols/actions';
import {Bytes32, Uint256} from '../type-aliases';

export interface UpdateChannelFundingParams {
  channelId: ChannelId;
  assetHolderAddress?: CoreAddress;
  amount: Uint256;
}

export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
};

export type Output = SingleChannelOutput | MultipleChannelOutput;

type ChannelUpdatedEventName = 'channelUpdated';
type ChannelUpdatedEvent = {
  type: ChannelUpdatedEventName;
  value: SingleChannelOutput;
};

export type WalletEvent = ChannelUpdatedEvent;

export type WalletInterface = {
  // App utilities
  getParticipant(): Promise<Participant | undefined>;
  registerAppDefinition(appDefinition: string): Promise<void>;
  registerAppBytecode(appDefinition: string, bytecode: string): Promise<void>;
  // App channel management
  createChannels(
    args: CreateChannelParams,
    numberOfChannels: number
  ): Promise<MultipleChannelOutput>;

  joinChannels(channelIds: ChannelId[]): Promise<MultipleChannelOutput>;
  updateChannel(args: UpdateChannelParams): Promise<SingleChannelOutput>;
  closeChannel(args: CloseChannelParams): Promise<SingleChannelOutput>;
  getChannels(): Promise<MultipleChannelOutput>;
  getState(args: GetStateParams): Promise<SingleChannelOutput>;

  syncChannels(chanelIds: Bytes32[]): Promise<MultipleChannelOutput>;
  syncChannel(args: SyncChannelParams): Promise<SingleChannelOutput>;

  updateFundingForChannels(args: UpdateChannelFundingParams[]): Promise<MultipleChannelOutput>;
  // Wallet <-> Wallet communication
  pushMessage(m: unknown): Promise<MultipleChannelOutput>;
  pushUpdate(m: unknown): Promise<SingleChannelOutput>;

  mergeMessages(messages: Output[]): MultipleChannelOutput;
};
