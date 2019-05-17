import { SharedData } from '../state';
import { ChallengerState } from './dispute/challenger/states';

import { DirectFundingState } from './direct-funding/state';
import { FundingState } from './funding/states';
import { IndirectFundingState } from './indirect-funding/state';
import { ResponderState } from './dispute/responder/state';
import { WithdrawalState } from './withdrawing/states';
import { ApplicationState } from './application/states';
import { IndirectDefundingState } from './indirect-defunding/state';
import { DefundingState } from './defunding/states';
import { ConcludingState } from './concluding/state';

export type ProtocolState =
  | ApplicationState
  | IndirectFundingState
  | DirectFundingState
  | WithdrawalState
  | ResponderState
  | FundingState
  | DefundingState
  | ChallengerState
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
