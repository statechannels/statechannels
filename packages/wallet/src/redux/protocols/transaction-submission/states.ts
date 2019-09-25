import { StateConstructor } from '../../utils';
import { TransactionRequest } from 'ethers/providers';
import { ProtocolState } from '..';

// -------
// States
// -------

export type FailureReason = 'TransactionFailed' | 'UserDeclinedRetry';

export interface WaitForSend {
  type: 'TransactionSubmission.WaitForSend';
  transaction: TransactionRequest;
  processId: string;
  channelId: string;
}

export interface WaitForSubmission {
  type: 'TransactionSubmission.WaitForSubmission';
  transaction: TransactionRequest;
  processId: string;
  channelId: string;
}

export interface WaitForConfirmation {
  type: 'TransactionSubmission.WaitForConfirmation';
  transaction: TransactionRequest;
  transactionHash: string;
  processId: string;
  channelId: string;
}

export interface ApproveRetry {
  type: 'TransactionSubmission.ApproveRetry';
  transaction: TransactionRequest;
  processId: string;
  channelId: string;
}

export interface Failure {
  type: 'TransactionSubmission.Failure';
  reason: FailureReason;
}

export interface Success {
  type: 'TransactionSubmission.Success';
}

// -------
// Helpers
// -------

export function isTerminal(state: TransactionSubmissionState): state is Failure | Success {
  return (
    state.type === 'TransactionSubmission.Failure' || state.type === 'TransactionSubmission.Success'
  );
}

export function isSuccess(state: TransactionSubmissionState): state is Success {
  return state.type === 'TransactionSubmission.Success';
}

export function isFailure(state: TransactionSubmissionState): state is Failure {
  return state.type === 'TransactionSubmission.Failure';
}

// ------------
// Constructors
// ------------

export const waitForSend: StateConstructor<WaitForSend> = p => {
  return { ...p, type: 'TransactionSubmission.WaitForSend' };
};

export const waitForSubmission: StateConstructor<WaitForSubmission> = p => {
  return { ...p, type: 'TransactionSubmission.WaitForSubmission' };
};

export const approveRetry: StateConstructor<ApproveRetry> = p => {
  return { ...p, type: 'TransactionSubmission.ApproveRetry' };
};

export const waitForConfirmation: StateConstructor<WaitForConfirmation> = p => {
  return {
    ...p,
    type: 'TransactionSubmission.WaitForConfirmation',
  };
};

export function success({}): Success {
  return { type: 'TransactionSubmission.Success' };
}

export function failure(reason: FailureReason): Failure {
  return { type: 'TransactionSubmission.Failure', reason };
}

// -------
// Unions and Guards
// -------

export type TransactionSubmissionState = NonTerminalTransactionSubmissionState | Success | Failure;
export type TransactionSubmissionStateType = TransactionSubmissionState['type'];

export type NonTerminalTransactionSubmissionState =
  | WaitForSend
  | WaitForSubmission
  | WaitForConfirmation
  | ApproveRetry;

export function isTransactionSubmissionState(
  state: ProtocolState,
): state is TransactionSubmissionState {
  return (
    state.type === 'TransactionSubmission.WaitForSend' ||
    state.type === 'TransactionSubmission.WaitForSubmission' ||
    state.type === 'TransactionSubmission.WaitForConfirmation' ||
    state.type === 'TransactionSubmission.ApproveRetry'
  );
}
