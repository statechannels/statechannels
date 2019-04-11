import {
  TransactionAction,
  TRANSACTION_SENT_TO_METAMASK,
  TRANSACTION_SUBMISSION_FAILED,
  TRANSACTION_SUBMITTED,
  TRANSACTION_CONFIRMED,
  RETRY_TRANSACTION,
} from './actions';
import {
  TransactionSubmissionState as TSState,
  waitForSubmission,
  approveRetry,
  waitForConfirmation,
  success,
  start,
  START,
  WAIT_FOR_SUBMISSION,
  WAIT_FOR_CONFIRMATION,
  APPROVE_RETRY,
} from './states';
import { TransactionRequest } from 'ethers/providers';
import { unreachable } from '../../../utils/reducer-utils';
import { SharedData } from '..';

type Storage = SharedData;

interface ReturnVal {
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
    case TRANSACTION_SENT_TO_METAMASK:
      return transactionSentToMetamask(state, storage);
    case TRANSACTION_SUBMISSION_FAILED:
      return transactionSubmissionFailed(state, storage);
    case TRANSACTION_SUBMITTED:
      return transactionSubmitted(state, storage, action.transactionHash);
    case TRANSACTION_CONFIRMED:
      return transactionConfirmed(state, storage);
    case RETRY_TRANSACTION:
      return retryTransaction(state, storage);
    default:
      return unreachable(action);
  }
}

export function initialize(transaction: TransactionRequest, storage: Storage): ReturnVal {
  // TODO: queue transaction
  return { state: start({ transaction }), storage };
}

function transactionSentToMetamask(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== START) {
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
    case START: // just in case we didn't hear the TRANSACTION_SENT_TO_METAMASK
      return { state: waitForConfirmation({ ...state, transactionHash }), storage };
    default:
      return { state, storage };
  }
}

function transactionConfirmed(state: TSState, storage: Storage): ReturnVal {
  switch (state.type) {
    case WAIT_FOR_CONFIRMATION:
    case WAIT_FOR_SUBMISSION: // in case we didn't hear the TRANSACTION_SUBMITTED
    case START: // in case we didn't hear the TRANSACTION_SENT_TO_METAMASK
      return { state: success(), storage };
    default:
      return { state, storage };
  }
}

function retryTransaction(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== APPROVE_RETRY) {
    return { state, storage };
  }
  // TODO: queue transaction
  return { state: start(state), storage };
}
