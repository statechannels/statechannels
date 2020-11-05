import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  CloseChannelParams,
  GetStateParams,
  ChannelId,
} from '@statechannels/client-api-schema';
import {Participant} from '@statechannels/wallet-core';

import {
  MultipleChannelOutput,
  SingleChannelOutput,
  UpdateChannelFundingParams,
  Message,
} from './wallet';

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

  mergeMessages(messages: Message[]): MultipleChannelOutput;
};
