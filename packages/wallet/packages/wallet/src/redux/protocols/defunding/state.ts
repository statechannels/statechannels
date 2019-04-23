import { WithdrawalState } from '../withdrawing/states';
import { Properties } from '../../utils';

export const WAIT_FOR_WITHDRAWAL = 'WaitForWithdrawal';
export const WAIT_FOR_LEDGER_DEFUNDING = 'WaitForLedgerDefunding';
export const FAILURE = 'Failure';
export const SUCCESS = 'Success';

export type DefundingState = WaitForWithdrawal | WaitForLedgerDefunding | Failure | Success;

export type FailureReason =
  | 'Withdrawal Failure'
  | 'Ledger De-funding Failure'
  | 'Channel Not Closed';

export interface WaitForWithdrawal {
  type: typeof WAIT_FOR_WITHDRAWAL;
  processId: string;
  withdrawalState: WithdrawalState;
}

export interface WaitForLedgerDefunding {
  type: typeof WAIT_FOR_LEDGER_DEFUNDING;
  processId: string;
  // TODO: This will be typed to Ledger Defunding state when it exists
  ledgerDefundingState: any;
}

export interface Failure {
  type: typeof FAILURE;
  reason: string;
}

export interface Success {
  type: typeof SUCCESS;
}

// -------
// Helpers
// -------

export function isTerminal(state: DefundingState): state is Failure | Success {
  return state.type === FAILURE || state.type === SUCCESS;
}

// -------
// Constructors
// -------

export function waitForWithdrawal(properties: Properties<WaitForWithdrawal>): WaitForWithdrawal {
  const { processId, withdrawalState } = properties;
  return { type: WAIT_FOR_WITHDRAWAL, processId, withdrawalState };
}

export function waitForLedgerDefunding(
  properties: Properties<WaitForLedgerDefunding>,
): WaitForLedgerDefunding {
  const { processId, ledgerDefundingState } = properties;
  return { type: WAIT_FOR_LEDGER_DEFUNDING, processId, ledgerDefundingState };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: FailureReason): Failure {
  return { type: FAILURE, reason };
}
