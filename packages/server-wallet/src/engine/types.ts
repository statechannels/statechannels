import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  CloseChannelParams,
  GetStateParams,
  ChannelId,
  ChannelResult,
} from '@statechannels/client-api-schema';
import {Config} from 'knex';

import {ChainRequest} from '../chain-service';
import {WalletObjective} from '../models/objective';
import {Outgoing} from '../protocols/actions';
import {Bytes32} from '../type-aliases';

import {MetricsConfiguration} from '.';

export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
  newObjective: WalletObjective | undefined;
  chainRequests: ChainRequest[];
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  newObjectives: WalletObjective[];
  completedObjectives: WalletObjective[];

  chainRequests: ChainRequest[];
};

export type Output = SingleChannelOutput | MultipleChannelOutput;

export interface EngineInterface {
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

  challenge(channelId: string): Promise<SingleChannelOutput>;

  // Engine <-> Engine communication
  pushMessage(m: unknown): Promise<MultipleChannelOutput>;
  pushUpdate(m: unknown): Promise<SingleChannelOutput>;

  crank(channelIds: string[]): Promise<MultipleChannelOutput>;
}

export function isMultipleChannelOutput(
  output: SingleChannelOutput | MultipleChannelOutput
): output is MultipleChannelOutput {
  return 'newObjectives' in output;
}

export function hasNewObjective(
  response: SingleChannelOutput
): response is SingleChannelOutput & {newObjective: WalletObjective} {
  return !!response.newObjective;
}

export type IncomingEngineConfigV2 = {
  skipEvmValidation: boolean;
  metrics: MetricsConfiguration;
  dbConfig: Config;
  chainNetworkID: string;
  workerThreadAmount: number;
};
