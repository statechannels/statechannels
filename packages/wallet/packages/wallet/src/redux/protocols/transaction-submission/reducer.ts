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
  NonTerminalTransactionSubmissionState as NonTerminalTSState,
  waitForSubmission,
  approveRetry,
  waitForConfirmation,
  success,
  waitForSend,
  failure,
} from './states';
import { unreachable } from '../../../utils/reducer-utils';
import { TransactionRequest } from 'ethers/providers';
import { queueTransaction, SharedData } from '../../state';

type Storage = SharedData;

export interface ReturnVal {
  state: TSState;
  storage: Storage;
}
// call it storage?
export function transactionReducer(
  state: NonTerminalTSState,
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
): { state: NonTerminalTSState; storage: SharedData } {
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId }), storage };
}

function transactionSent(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForSend') {
    return { state, storage };
  }
  return { state: waitForSubmission(state), storage };
}

function transactionSubmissionFailed(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForSubmission') {
    return { state, storage };
  }
  return { state: approveRetry(state), storage };
}

function transactionSubmitted(
  state: NonTerminalTSState,
  storage: Storage,
  transactionHash: string,
): ReturnVal {
  switch (state.type) {
    case 'WaitForSubmission':
    case 'WaitForSend': // just in case we didn't hear the TRANSACTION_SENT
      return { state: waitForConfirmation({ ...state, transactionHash }), storage };
    default:
      return { state, storage };
  }
}

function transactionConfirmed(state: NonTerminalTSState, storage: Storage): ReturnVal {
  switch (state.type) {
    case 'WaitForConfirmation':
    case 'WaitForSubmission': // in case we didn't hear the TRANSACTION_SUBMITTED
    case 'WaitForSend': // in case we didn't hear the TRANSACTION_SENT
      return { state: success(), storage };
    default:
      return { state, storage };
  }
}

function transactionRetryApproved(state: NonTerminalTSState, storage: Storage): ReturnVal {
  if (state.type !== 'ApproveRetry') {
    return { state, storage };
  }
  const { transaction, processId } = state;
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId }), storage };
}

function transactionRetryDenied(state: NonTerminalTSState, storage: Storage): ReturnVal {
  return { state: failure('UserDeclinedRetry'), storage };
}

function transactionFailed(state: NonTerminalTSState, storage: Storage): ReturnVal {
  return { state: failure('TransactionFailed'), storage };
}
