import { WalletAction } from '../../actions';
import { ActionConstructor } from '../../utils';

// -------
// Actions
// -------

export interface TransactionSent {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT';
  processId: string;
}

export interface TransactionSubmissionFailed {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED';
  processId: string;
  error: { message?: string; code };
}

export interface TransactionSubmitted {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED';
  processId: string;
  transactionHash: string;
}

export interface TransactionConfirmed {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED';
  processId: string;
  contractAddress?: string;
}
export interface TransactionRetryApproved {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED';
  processId: string;
}
export interface TransactionRetryDenied {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED';
  processId: string;
}

export interface TransactionFailed {
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_FAILED';
  processId: string;
}
// --------
// Constructors
// --------

export const transactionSent: ActionConstructor<TransactionSent> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT',
});

export const transactionSubmissionFailed: ActionConstructor<TransactionSubmissionFailed> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED',
});

export const transactionSubmitted: ActionConstructor<TransactionSubmitted> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED',
});

export const transactionConfirmed: ActionConstructor<TransactionConfirmed> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED',
});

export const transactionRetryApproved: ActionConstructor<TransactionRetryApproved> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED',
});

export const transactionRetryDenied: ActionConstructor<TransactionRetryDenied> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED',
});

export const transactionFailed: ActionConstructor<TransactionFailed> = p => ({
  ...p,
  type: 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_FAILED',
});
// --------
// Unions and Guards
// --------

export type TransactionAction =
  | TransactionSent
  | TransactionSubmissionFailed
  | TransactionSubmitted
  | TransactionConfirmed
  | TransactionRetryApproved
  | TransactionRetryDenied
  | TransactionFailed;

export const isTransactionAction = (action: WalletAction): action is TransactionAction => {
  return (
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_FAILED' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED' ||
    action.type === 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED'
  );
};
