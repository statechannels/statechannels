import { OpeningState, WaitForChannel } from './opening/state';
import { RunningState } from './running/state';
import { FundingState } from './funding/state';
import { ChallengingState } from './challenging/state';
import { RespondingState } from './responding/state';
import { WithdrawingState } from './withdrawing/state';
import { ClosingState } from './closing/state';

export interface InitializingChannelStatus {
  address: string;
  privateKey: string;
}

export interface InitializingChannelState {
  [participantAddress: string]: InitializingChannelStatus;
}

export type OpenedState =
  | FundingState
  | RunningState
  | ChallengingState
  | RespondingState
  | WithdrawingState
  | ClosingState;

export type ChannelStatus = OpeningState | OpenedState;

export interface InitializedChannelState {
  [channelId: string]: ChannelStatus;
}
export interface ChannelState {
  initializingChannels: InitializingChannelState;
  initializedChannels: InitializedChannelState;
  activeAppChannelId?: string;
}

// -------------------
// Getters and setters
// -------------------

// WaitForChannel is the only ChannelStatus without a channelId.
// We don't need it anymore, as it's covered by InitializingChannelStatus.
// This is a temporary fix to the signature while we work to remove it.
type ChannelStatusV2 = Exclude<ChannelStatus, WaitForChannel>;

export function setChannel(channelStore: ChannelState, channel: ChannelStatusV2): ChannelState {
  const channelId = channel.channelId;
  const initializedChannels = { ...channelStore.initializedChannels, [channelId]: channel };
  return { ...channelStore, initializedChannels };
}

export * from './opening/state';
export * from './running/state';
export * from './funding/state';
export * from './challenging/state';
export * from './responding/state';
export * from './withdrawing/state';
export * from './closing/state';
