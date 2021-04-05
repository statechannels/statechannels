import {
  UpdateChannelParams,
  CreateChannelParams,
  SyncChannelParams,
  CloseChannelParams,
  GetStateParams,
  ChannelId,
  ChannelResult,
} from '@statechannels/client-api-schema';

import {HoldingUpdatedArg} from '../chain-service';
import {WalletObjective} from '../models/objective';
import {Outgoing} from '../protocols/actions';
import {Bytes32} from '../type-aliases';

export type SingleChannelOutput = {
  outbox: Outgoing[];
  channelResult: ChannelResult;
  newObjective: WalletObjective | undefined;
};
export type MultipleChannelOutput = {
  outbox: Outgoing[];
  channelResults: ChannelResult[];
  newObjectives: WalletObjective[];
};

export type Output = SingleChannelOutput | MultipleChannelOutput;

type ChannelUpdatedEvent = {
  type: 'channelUpdated';
  value: SingleChannelOutput;
};

type ObjectiveStarted = {
  type: 'objectiveStarted';
  value: WalletObjective;
};
type ObjectiveSucceeded = {
  type: 'objectiveSucceeded';
  value: WalletObjective;
};

export type EngineEvent = ChannelUpdatedEvent | ObjectiveStarted | ObjectiveSucceeded;

export interface EngineInterface {
  // App utilities
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

  challenge(channelId: string): Promise<SingleChannelOutput>;

  // TODO: Should this live on a TestEngineInterface?
  updateFundingForChannels(args: HoldingUpdatedArg[]): Promise<MultipleChannelOutput>;
  // Engine <-> Engine communication
  pushMessage(m: unknown): Promise<MultipleChannelOutput>;
  pushUpdate(m: unknown): Promise<SingleChannelOutput>;
}
