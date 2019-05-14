import { WithdrawalState } from '../withdrawing/states';
import { Properties } from '../../utils';
import { IndirectDefundingState } from '../indirect-defunding/state';

export const WAIT_FOR_WITHDRAWAL = 'WaitForWithdrawal';
export const WAIT_FOR_INDIRECT_DEFUNDING = 'WaitForIndirectDefunding';
export const FAILURE = 'Failure';
export const SUCCESS = 'Success';

export type NonTerminalDefundingState = WaitForWithdrawal | WaitForIndirectDefunding;
export type DefundingState = WaitForWithdrawal | WaitForIndirectDefunding | Failure | Success;

export type FailureReason =
  | 'Withdrawal Failure'
  | 'Ledger De-funding Failure'
  | 'Channel Not Closed';

export interface WaitForWithdrawal {
  type: typeof WAIT_FOR_WITHDRAWAL;
  processId: string;
  withdrawalState: WithdrawalState;
  channelId;
}

export interface WaitForIndirectDefunding {
  type: typeof WAIT_FOR_INDIRECT_DEFUNDING;
  processId: string;
  indirectDefundingState: IndirectDefundingState;
  channelId;
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

export function isSuccess(state: DefundingState): state is Success {
  return state.type === SUCCESS;
}

export function isFailure(state: DefundingState): state is Failure {
  return state.type === FAILURE;
}

// -------
// Constructors
// -------

export function waitForWithdrawal(properties: Properties<WaitForWithdrawal>): WaitForWithdrawal {
  const { processId, withdrawalState, channelId } = properties;
  return { type: WAIT_FOR_WITHDRAWAL, processId, withdrawalState, channelId };
}

export function waitForLedgerDefunding(
  properties: Properties<WaitForIndirectDefunding>,
): WaitForIndirectDefunding {
  const { processId, indirectDefundingState: ledgerDefundingState, channelId } = properties;
  return {
    type: WAIT_FOR_INDIRECT_DEFUNDING,
    processId,
    indirectDefundingState: ledgerDefundingState,
    channelId,
  };
}

export function success(): Success {
  return { type: SUCCESS };
}

export function failure(reason: FailureReason): Failure {
  return { type: FAILURE, reason };
}
