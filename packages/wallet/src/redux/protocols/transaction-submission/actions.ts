import {EngineAction} from "../../actions";
import {ActionConstructor} from "../../utils";

// -------
// Actions
// -------

export interface TransactionSent {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SENT";
  processId: string;
}

export interface TransactionSubmissionFailed {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED";
  processId: string;
  error: {message?: string; code};
}

export interface TransactionSubmitted {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED";
  processId: string;
  transactionHash: string;
}

export interface TransactionConfirmed {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED";
  processId: string;
  contractAddress?: string;
}
export interface TransactionRetryApproved {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED";
  processId: string;
}
export interface TransactionRetryDenied {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED";
  processId: string;
}

export interface TransactionFailed {
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_FAILED";
  processId: string;
}
// --------
// Constructors
// --------

export const transactionSent: ActionConstructor<TransactionSent> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SENT"
});

export const transactionSubmissionFailed: ActionConstructor<TransactionSubmissionFailed> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED"
});

export const transactionSubmitted: ActionConstructor<TransactionSubmitted> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED"
});

export const transactionConfirmed: ActionConstructor<TransactionConfirmed> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED"
});

export const transactionRetryApproved: ActionConstructor<TransactionRetryApproved> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED"
});

export const transactionRetryDenied: ActionConstructor<TransactionRetryDenied> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED"
});

export const transactionFailed: ActionConstructor<TransactionFailed> = p => ({
  ...p,
  type: "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_FAILED"
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

export const isTransactionAction = (action: EngineAction): action is TransactionAction => {
  return (
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_FAILED" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SENT" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED" ||
    action.type === "ENGINE.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED"
  );
};
