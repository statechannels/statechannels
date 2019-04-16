import {
  TransactionAction,
  TRANSACTION_SENT,
  TRANSACTION_SUBMISSION_FAILED,
  TRANSACTION_SUBMITTED,
  TRANSACTION_CONFIRMED,
  TRANSACTION_FAILED,
  TRANSACTION_RETRY_APPROVED,
  TRANSACTION_RETRY_DENIED,
} from './actions';
import {
  TransactionSubmissionState as TSState,
  waitForSubmission,
  approveRetry,
  waitForConfirmation,
  success,
  waitForSend,
  WAIT_FOR_SEND,
  WAIT_FOR_SUBMISSION,
  WAIT_FOR_CONFIRMATION,
  APPROVE_RETRY,
  failure,
} from './states';
import { unreachable } from '../../../utils/reducer-utils';
import { SharedData } from '..';
import { TransactionRequest } from 'ethers/providers';
import { queueTransaction } from '../../state';

type Storage = SharedData;

export interface ReturnVal {
  state: TSState;
  storage: Storage;
}
// call it storage?
export function transactionReducer(
  state: TSState,
  storage: SharedData,
  action: TransactionAction,
): ReturnVal {
  switch (action.type) {
    case TRANSACTION_SENT:
      return transactionSent(state, storage);
    case TRANSACTION_SUBMISSION_FAILED:
      return transactionSubmissionFailed(state, storage);
    case TRANSACTION_SUBMITTED:
      return transactionSubmitted(state, storage, action.transactionHash);
    case TRANSACTION_CONFIRMED:
      return transactionConfirmed(state, storage);
    case TRANSACTION_RETRY_APPROVED:
      return transactionRetryApproved(state, storage);
    case TRANSACTION_RETRY_DENIED:
      return transactionRetryDenied(state, storage);
    case TRANSACTION_FAILED:
      return transactionFailed(state, storage);
    default:
      return unreachable(action);
  }
}

export function initialize(
  transaction: TransactionRequest,
  processId: string,
  storage: Storage,
): ReturnVal {
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId }), storage };
}

function transactionSent(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== WAIT_FOR_SEND) {
    return { state, storage };
  }
  return { state: waitForSubmission(state), storage };
}

function transactionSubmissionFailed(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== WAIT_FOR_SUBMISSION) {
    return { state, storage };
  }
  return { state: approveRetry(state), storage };
}

function transactionSubmitted(
  state: TSState,
  storage: Storage,
  transactionHash: string,
): ReturnVal {
  switch (state.type) {
    case WAIT_FOR_SUBMISSION:
    case WAIT_FOR_SEND: // just in case we didn't hear the TRANSACTION_SENT
      return { state: waitForConfirmation({ ...state, transactionHash }), storage };
    default:
      return { state, storage };
  }
}

function transactionConfirmed(state: TSState, storage: Storage): ReturnVal {
  switch (state.type) {
    case WAIT_FOR_CONFIRMATION:
    case WAIT_FOR_SUBMISSION: // in case we didn't hear the TRANSACTION_SUBMITTED
    case WAIT_FOR_SEND: // in case we didn't hear the TRANSACTION_SENT
      return { state: success(), storage };
    default:
      return { state, storage };
  }
}

function transactionRetryApproved(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== APPROVE_RETRY) {
    return { state, storage };
  }
  const { transaction, processId } = state;
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId }), storage };
}

function transactionRetryDenied(state: TSState, storage: Storage): ReturnVal {
  return { state: failure('User denied retry'), storage };
}

function transactionFailed(state: TSState, storage: Storage): ReturnVal {
  return { state: failure('Transaction failed'), storage };
}
