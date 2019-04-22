import { IndirectFundingState } from './indirect-funding/state';
import { DirectFundingState } from './direct-funding/state';
import { WithdrawalState } from './withdrawing/states';
import { SharedData } from '../state';
import { RespondingState } from './responding/state';
import { FundingState } from './funding/states';

export type ProtocolState =
  | IndirectFundingState
  | DirectFundingState
  | WithdrawalState
  | RespondingState
  | FundingState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}
