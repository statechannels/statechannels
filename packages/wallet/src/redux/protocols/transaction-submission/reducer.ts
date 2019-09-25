import { TransactionAction } from './actions';
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
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SENT':
      return transactionSent(state, storage);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMISSION_FAILED':
      return transactionSubmissionFailed(state, storage);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_SUBMITTED':
      return transactionSubmitted(state, storage, action.transactionHash);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_CONFIRMED':
      return transactionConfirmed(state, storage);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_APPROVED':
      return transactionRetryApproved(state, storage);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_RETRY_DENIED':
      return transactionRetryDenied(state, storage);
    case 'WALLET.TRANSACTION_SUBMISSION.TRANSACTION_FAILED':
      return transactionFailed(state, storage);
    default:
      return unreachable(action);
  }
}

export function initialize(
  transaction: TransactionRequest,
  processId: string,
  channelId: string,
  storage: Storage,
): { state: NonTerminalTSState; storage: SharedData } {
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId, channelId }), storage };
}

function transactionSent(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== 'TransactionSubmission.WaitForSend') {
    return { state, storage };
  }
  return { state: waitForSubmission(state), storage };
}

function transactionSubmissionFailed(state: TSState, storage: Storage): ReturnVal {
  if (state.type !== 'TransactionSubmission.WaitForSubmission') {
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
    case 'TransactionSubmission.WaitForSubmission':
    case 'TransactionSubmission.WaitForSend': // just in case we didn't hear the TRANSACTION_SENT
      return { state: waitForConfirmation({ ...state, transactionHash }), storage };
    default:
      return { state, storage };
  }
}

function transactionConfirmed(state: NonTerminalTSState, storage: Storage): ReturnVal {
  switch (state.type) {
    case 'TransactionSubmission.WaitForConfirmation':
    case 'TransactionSubmission.WaitForSubmission': // in case we didn't hear the TRANSACTION_SUBMITTED
    case 'TransactionSubmission.WaitForSend': // in case we didn't hear the TRANSACTION_SENT
      return { state: success({}), storage };
    default:
      return { state, storage };
  }
}

function transactionRetryApproved(state: NonTerminalTSState, storage: Storage): ReturnVal {
  if (state.type !== 'TransactionSubmission.ApproveRetry') {
    return { state, storage };
  }
  const { transaction, processId, channelId } = state;
  storage = queueTransaction(storage, transaction, processId);
  return { state: waitForSend({ transaction, processId, channelId }), storage };
}

function transactionRetryDenied(state: NonTerminalTSState, storage: Storage): ReturnVal {
  return { state: failure('UserDeclinedRetry'), storage };
}

function transactionFailed(state: NonTerminalTSState, storage: Storage): ReturnVal {
  return { state: failure('TransactionFailed'), storage };
}
