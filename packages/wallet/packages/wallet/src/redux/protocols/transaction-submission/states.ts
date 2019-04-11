import { TransactionRequest } from 'ethers/providers';
import { Properties as P } from '../../utils';

export type TransactionSubmissionState =
  | Start
  | WaitForSubmission
  | WaitForConfirmation
  | ApproveRetry
  | Success
  | Fail;

export const START = 'Start';
export const WAIT_FOR_SUBMISSION = 'WaitForSubmission';
export const WAIT_FOR_CONFIRMATION = 'WaitForConfirmation';
export const APPROVE_RETRY = 'ApproveRetry';
export const FAIL = 'Fail';
export const SUCCESS = 'Success';

export interface Start {
  type: typeof START;
  transaction: TransactionRequest;
}

export interface WaitForSubmission {
  type: typeof WAIT_FOR_SUBMISSION;
  transaction: TransactionRequest;
}

export interface WaitForConfirmation {
  type: typeof WAIT_FOR_CONFIRMATION;
  transaction: TransactionRequest;
  transactionHash: string;
}

export interface ApproveRetry {
  type: typeof APPROVE_RETRY;
  transaction: TransactionRequest;
}

export interface Fail {
  type: typeof FAIL;
  reason: string;
}

export interface Success {
  type: typeof SUCCESS;
}

// -------
// Helpers
// -------

export function isTerminal(state: TransactionSubmissionState): state is Fail | Success {
  return state.type === FAIL || state.type === SUCCESS;
}

// ------------
// Constructors
// ------------

export function start(p: P<Start>): Start {
  return { type: START, transaction: p.transaction };
}

export function waitForSubmission(p: P<WaitForSubmission>): WaitForSubmission {
  return { type: WAIT_FOR_SUBMISSION, transaction: p.transaction };
}

export function approveRetry(p: P<ApproveRetry>): ApproveRetry {
  return { type: APPROVE_RETRY, transaction: p.transaction };
}

export function waitForConfirmation(p: P<WaitForConfirmation>): WaitForConfirmation {
  const { transaction, transactionHash } = p;
  return { type: WAIT_FOR_CONFIRMATION, transaction, transactionHash };
}

export function success(): Success {
  return { type: SUCCESS };
}
