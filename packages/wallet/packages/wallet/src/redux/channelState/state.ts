import { OpeningState } from './opening/state';
import { RunningState } from './running/state';
import { FundingState } from './funding/state';
import { ChallengingState } from './challenging/state';
import { RespondingState } from './responding/state';
import { WithdrawingState } from './withdrawing/state';
import { ClosingState } from './closing/state';

export type OpenedChannelState =
  | FundingState
  | RunningState
  | ChallengingState
  | RespondingState
  | WithdrawingState
  | ClosingState;

export type ChannelState = OpeningState | OpenedChannelState;

export * from './opening/state';
export * from './running/state';
export * from './funding/state';
export * from './challenging/state';
export * from './responding/state';
export * from './withdrawing/state';
export * from './closing/state';
