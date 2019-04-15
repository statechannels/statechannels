import { BaseProcessAction } from '../actions';

export type TransactionAction =
  | TransactionSentToMetamask
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | TransactionConfirmed
  | RetryTransaction;

export const TRANSACTION_SENT_TO_METAMASK = 'WALLET.TRANSACTION_SENT_TO_METAMASK';
export const TRANSACTION_SUBMISSION_FAILED = 'WALLET.TRANSACTION_SUBMISSION_FAILED';
export const TRANSACTION_SUBMITTED = 'WALLET.TRANSACTION_SUBMITTED';
export const TRANSACTION_CONFIRMED = 'WALLET.TRANSACTION_CONFIRMED';
export const RETRY_TRANSACTION = 'WALLET.RETRY_TRANSACTION';
export const TRANSACTION_FINALIZED = 'WALLET.TRANSACTION_FINALIZED';

export interface TransactionSentToMetamask extends BaseProcessAction {
  type: typeof TRANSACTION_SENT_TO_METAMASK;
  channelId: string;
  processId: string;
}

export interface TransactionSubmissionFailed extends BaseProcessAction {
  type: typeof TRANSACTION_SUBMISSION_FAILED;
  channelId: string;
  processId: string;
  error: { message?: string; code };
}

export interface TransactionSubmitted extends BaseProcessAction {
  type: typeof TRANSACTION_SUBMITTED;
  channelId: string;
  processId: string;
  transactionHash: string;
}

export interface TransactionConfirmed extends BaseProcessAction {
  type: typeof TRANSACTION_CONFIRMED;
  channelId: string;
  processId: string;
  contractAddress?: string;
}

export interface TransactionFinalized extends BaseProcessAction {
  type: typeof TRANSACTION_FINALIZED;
  channelId: string;
  processId: string;
}

export interface RetryTransaction extends BaseProcessAction {
  type: typeof RETRY_TRANSACTION;
  channelId: string;
  processId: string;
}

// --------
// Creators
// --------

export const transactionSentToMetamask = (
  channelId: string,
  processId: string,
): TransactionSentToMetamask => ({
  type: TRANSACTION_SENT_TO_METAMASK,
  channelId,
  processId,
});

export const transactionSubmissionFailed = (
  channelId: string,
  processId: string,
  error: { message?: string; code },
): TransactionSubmissionFailed => ({
  type: TRANSACTION_SUBMISSION_FAILED,
  error,
  channelId,
  processId,
});

export const transactionSubmitted = (
  channelId: string,
  processId: string,
  transactionHash: string,
): TransactionSubmitted => ({
  type: TRANSACTION_SUBMITTED,
  channelId,
  processId,
  transactionHash,
});

export const transactionConfirmed = (
  channelId: string,
  processId: string,
  contractAddress?: string,
): TransactionConfirmed => ({
  type: TRANSACTION_CONFIRMED,

  channelId,
  processId,
  contractAddress,
});

export const transactionFinalized = (
  channelId: string,
  processId: string,
): TransactionFinalized => ({
  type: TRANSACTION_FINALIZED,
  channelId,
  processId,
});

export const retryTransaction = (channelId: string, processId: string): RetryTransaction => ({
  type: RETRY_TRANSACTION,
  channelId,
  processId,
});
