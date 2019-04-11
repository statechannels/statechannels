export type TransactionAction =
  | TransactionSentToMetamask
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | TransactionConfirmed
  | RetryTransaction;

export const TRANSACTION_SENT_TO_METAMASK = 'WALLET.COMMON.TRANSACTION_SENT_TO_METAMASK';
export const TRANSACTION_SUBMISSION_FAILED = 'WALLET.COMMON.TRANSACTION_SUBMISSION_FAILED';
export const TRANSACTION_SUBMITTED = 'WALLET.COMMON.TRANSACTION_SUBMITTED';
export const TRANSACTION_CONFIRMED = 'WALLET.COMMON.TRANSACTION_CONFIRMED';
export const RETRY_TRANSACTION = 'WALLET.COMMON.RETRY_TRANSACTION';

export interface TransactionSentToMetamask {
  type: typeof TRANSACTION_SENT_TO_METAMASK;
  channelId: string;
  processId: string;
}
export interface TransactionSubmissionFailed {
  type: typeof TRANSACTION_SUBMISSION_FAILED;
  channelId: string;
  processId: string;
  error: { message?: string; code };
}

export interface TransactionSubmitted {
  type: typeof TRANSACTION_SUBMITTED;
  channelId: string;
  processId: string;
  transactionHash: string;
}

export interface TransactionConfirmed {
  type: typeof TRANSACTION_CONFIRMED;
  channelId: string;
  processId: string;
  contractAddress?: string;
}

export interface TransactionFinalized {
  type: typeof TRANSACTION_FINALIZED;
  channelId: string;
  processId: string;
}

export const TRANSACTION_FINALIZED = 'WALLET.COMMON.TRANSACTION_FINALIZED';

export interface RetryTransaction {
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
  channelId,
  processId,
  type: TRANSACTION_FINALIZED,
});

export const retryTransaction = (channelId: string, processId: string): RetryTransaction => ({
  type: RETRY_TRANSACTION,
  channelId,
  processId,
});
