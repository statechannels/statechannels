import { SharedData } from '../state';
import { ChallengingState } from './challenging/states';
import { ConcludingState } from './concluding/states';
import { DefundingState } from './defunding/state';
import { DirectFundingState } from './direct-funding/state';
import { FundingState } from './funding/states';
import { IndirectFundingState } from './indirect-funding/state';
import { RespondingState } from './responding/state';
import { WithdrawalState } from './withdrawing/states';
import { ApplicationState } from './application/states';
import { IndirectDefundingState } from './indirect-defunding/state';

export type ProtocolState =
  | ApplicationState
  | IndirectFundingState
  | DirectFundingState
  | WithdrawalState
  | RespondingState
  | FundingState
  | DefundingState
  | ChallengingState
  | ConcludingState
  | IndirectDefundingState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}
