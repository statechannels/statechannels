import { SharedData } from '../state';
import { ChallengerState } from './dispute/challenger/states';

import { DirectFundingState } from './direct-funding/states';
import { FundingState } from './funding/states';
import { NewLedgerFundingState } from './new-ledger-funding/states';
import { ResponderState } from './dispute/responder/states';
import { WithdrawalState } from './withdrawing/states';
import { ApplicationState } from './application/states';
import { IndirectDefundingState } from './indirect-defunding/states';
import { DefundingState } from './defunding/states';
import { ConcludingState } from './concluding/states';
import { TransactionSubmissionState } from './transaction-submission';
import { ExistingLedgerFundingState } from './existing-ledger-funding/states';
import { LedgerTopUpState } from './ledger-top-up/states';
import { ConsensusUpdateState } from './consensus-update/states';
import { AdvanceChannelState } from './advance-channel';
import { VirtualFundingState } from './virtual-funding/states';
import { IndirectFundingState } from './indirect-funding/states';

export type ProtocolState =
  | ApplicationState
  | NewLedgerFundingState
  | VirtualFundingState
  | DirectFundingState
  | WithdrawalState
  | ResponderState
  | FundingState
  | DefundingState
  | ChallengerState
  | ConcludingState
  | IndirectDefundingState
  | TransactionSubmissionState
  | ExistingLedgerFundingState
  | LedgerTopUpState
  | ConsensusUpdateState
  | TransactionSubmissionState
  | AdvanceChannelState
  | IndirectFundingState;

export type ProtocolReducer<T extends ProtocolState> = (
  protocolState: T,
  sharedData: SharedData,
  action,
) => ProtocolStateWithSharedData<T>;

export interface ProtocolStateWithSharedData<T extends ProtocolState> {
  protocolState: T;
  sharedData: SharedData;
}

export function makeLocator(...args: string[]) {
  return args.join('-');
}
