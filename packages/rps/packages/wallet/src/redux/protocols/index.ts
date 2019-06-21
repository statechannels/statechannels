import { SharedData } from '../state';
import { ChallengerState } from './dispute/challenger/states';

import { DirectFundingState } from './direct-funding/states';
import { FundingState } from './funding/states';
import { IndirectFundingState } from './indirect-funding/states';
import { ResponderState } from './dispute/responder/states';
import { WithdrawalState } from './withdrawing/states';
import { ApplicationState } from './application/states';
import { IndirectDefundingState } from './indirect-defunding/states';
import { DefundingState } from './defunding/states';
import { ConcludingState } from './concluding/states';
import { TransactionSubmissionState } from './transaction-submission';
import { ExistingChannelFundingState } from './existing-channel-funding/states';
import { LedgerTopUpState } from './ledger-top-up/states';
import { ConsensusUpdateState } from './consensus-update/states';
import { AdvanceChannelState } from './advance-channel';

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
  | IndirectDefundingState
  | TransactionSubmissionState
  | ExistingChannelFundingState
  | LedgerTopUpState
  | ConsensusUpdateState
  | TransactionSubmissionState
  | AdvanceChannelState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}
