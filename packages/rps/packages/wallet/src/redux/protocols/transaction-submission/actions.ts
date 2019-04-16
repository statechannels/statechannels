import { BaseProcessAction } from '../actions';

export type TransactionAction =
  | TransactionSent
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | TransactionConfirmed
  | TransactionRetryApproved
  | TransactionRetryDenied
  | TransactionFailed;

export const TRANSACTION_SENT = 'WALLET.TRANSACTION_SENT';
export const TRANSACTION_SUBMITTED = 'WALLET.TRANSACTION_SUBMITTED';
export const TRANSACTION_SUBMISSION_FAILED = 'WALLET.TRANSACTION_SUBMISSION_FAILED';
export const TRANSACTION_CONFIRMED = 'WALLET.TRANSACTION_CONFIRMED';
export const TRANSACTION_FAILED = 'WALLET.TRANSACTION_FAILED';
export const TRANSACTION_RETRY_APPROVED = 'WALLET.TRANSACTION_RETRY_APPROVED';
export const TRANSACTION_RETRY_DENIED = 'WALLET.TRANSACTION_RETRY_DENIED';
export const TRANSACTION_FINALIZED = 'WALLET.TRANSACTION_FINALIZED'; // currently unused

export interface TransactionSent {
  type: typeof TRANSACTION_SENT;
  processId: string;
}

export interface TransactionSubmissionFailed extends BaseProcessAction {
  type: typeof TRANSACTION_SUBMISSION_FAILED;
  processId: string;
  error: { message?: string; code };
}

export interface TransactionSubmitted extends BaseProcessAction {
  type: typeof TRANSACTION_SUBMITTED;
  processId: string;
  transactionHash: string;
}

export interface TransactionConfirmed extends BaseProcessAction {
  type: typeof TRANSACTION_CONFIRMED;
  processId: string;
  contractAddress?: string;
}

export interface TransactionFinalized extends BaseProcessAction {
  type: typeof TRANSACTION_FINALIZED;
  processId: string;
}

export interface TransactionRetryApproved {
  type: typeof TRANSACTION_RETRY_APPROVED;
  processId: string;
}
export interface TransactionRetryDenied {
  type: typeof TRANSACTION_RETRY_DENIED;
  processId: string;
}

export interface TransactionFailed {
  type: typeof TRANSACTION_FAILED;
  processId: string;
}

// --------
// Creators
// --------

export const transactionSent = (processId: string): TransactionSent => ({
  type: TRANSACTION_SENT,
  processId,
});

export const transactionSubmissionFailed = (
  processId: string,
  error: { message?: string; code },
): TransactionSubmissionFailed => ({
  type: TRANSACTION_SUBMISSION_FAILED,
  error,
  processId,
});

export const transactionSubmitted = (
  processId: string,
  transactionHash: string,
): TransactionSubmitted => ({
  type: TRANSACTION_SUBMITTED,
  processId,
  transactionHash,
});

export const transactionConfirmed = (
  processId: string,
  contractAddress?: string,
): TransactionConfirmed => ({
  type: TRANSACTION_CONFIRMED,
  processId,
  contractAddress,
});

export const transactionFinalized = (processId: string): TransactionFinalized => ({
  type: TRANSACTION_FINALIZED,
  processId,
});

export const transactionRetryApproved = (processId: string): TransactionRetryApproved => ({
  type: TRANSACTION_RETRY_APPROVED,
  processId,
});

export const transactionRetryDenied = (processId: string): TransactionRetryDenied => ({
  type: TRANSACTION_RETRY_DENIED,
  processId,
});

export const transactionFailed = (processId: string): TransactionFailed => ({
  type: TRANSACTION_FAILED,
  processId,
});
