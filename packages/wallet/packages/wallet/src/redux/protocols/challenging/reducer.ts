import { ChallengingAction } from './actions';
import {
  ChallengingState as CState,
  NonTerminalState as NonTerminalCState,
  approveChallenge,
  waitForResponseOrTimeout,
  acknowledgeFailure as acknowledgeFailureState,
  FailureReason,
  waitForTransaction,
  acknowledgeResponse,
  acknowledgeTimeout,
  successClosed,
  successOpen,
  failure,
} from './states';
import { unreachable } from '../../../utils/reducer-utils';
import { SharedData } from '../../state';
import * as actions from './actions';
import { TransactionAction } from '../transaction-submission/actions';
import { isTransactionAction } from '../../actions';
import { transactionReducer, initialize as initializeTransaction } from '../transaction-submission';
import { isSuccess, isFailure } from '../transaction-submission/states';
import { getChannel } from '../../state';
import { createForceMoveTransaction } from '../../../utils/transaction-generator';
import { isFullyOpen, ourTurn } from '../../channel-store';

type Storage = SharedData;

export interface ReturnVal {
  state: CState;
  storage: Storage;
}

export function challengingReducer(
  state: NonTerminalCState,
  storage: SharedData,
  action: ChallengingAction | TransactionAction,
): ReturnVal {
  if (isTransactionAction(action)) {
    return handleTransactionAction(state, storage, action);
  }

  switch (action.type) {
    case actions.CHALLENGE_APPROVED:
      return challengeApproved(state, storage);
    case actions.CHALLENGE_DENIED:
      return challengeDenied(state, storage);
    case actions.CHALLENGE_RESPONSE_RECEIVED:
      return challengeResponseRecieved(state, storage);
    case actions.CHALLENGE_TIMED_OUT:
      return challengeTimedOut(state, storage);
    case actions.CHALLENGE_TIMEOUT_ACKNOWLEDGED:
      return challengeTimeoutAcknowledged(state, storage);
    case actions.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return challengeResponseAcknowledged(state, storage);
    case actions.CHALLENGE_FAILURE_ACKNOWLEDGED:
      return challengeFailureAcknowledged(state, storage);
    default:
      return unreachable(action);
  }
}

export function initialize(channelId: string, processId: string, storage: Storage): ReturnVal {
  const channelState = getChannel(storage, channelId);
  const props = { processId, channelId };

  if (!channelState) {
    return { state: acknowledgeFailure(props, 'ChannelDoesntExist'), storage };
  }

  if (!isFullyOpen(channelState)) {
    return { state: acknowledgeFailure(props, 'NotFullyOpen'), storage };
  }

  if (ourTurn(channelState)) {
    // if it's our turn we don't need to challenge
    return { state: acknowledgeFailure(props, 'AlreadyHaveLatest'), storage };
  }
  return { state: approveChallenge({ channelId, processId }), storage };
}

function handleTransactionAction(
  state: NonTerminalCState,
  storage: Storage,
  action: TransactionAction,
): ReturnVal {
  if (state.type !== 'WaitForTransaction') {
    return { state, storage };
  }
  const transactionSubmission = state.transactionSubmission;

  const retVal = transactionReducer(transactionSubmission, storage, action);
  const transactionState = retVal.state;

  if (isSuccess(transactionState)) {
    state = waitForResponseOrTimeout(state);
  } else if (isFailure(transactionState)) {
    state = acknowledgeFailure(state, 'TransactionFailed');
  } else {
    // update the transaction state
    state = { ...state, transactionSubmission: transactionState };
  }

  return { state, storage: retVal.storage };
}

function challengeApproved(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'ApproveChallenge') {
    return { state, storage };
  }
  const channelState = getChannel(storage, state.channelId);

  // These shouldn't have changed but the type system doesn't know that. In any case, we
  // might as well be safe. And type-safe...
  if (!channelState) {
    return { state: acknowledgeFailure(state, 'ChannelDoesntExist'), storage };
  }
  if (!isFullyOpen(channelState)) {
    return { state: acknowledgeFailure(state, 'NotFullyOpen'), storage };
  }

  if (ourTurn(channelState)) {
    // if it's our turn now, a commitment must have arrived while we were approving
    return { state: acknowledgeFailure(state, 'LatestWhileApproving'), storage };
  }

  // else if we don't have the last two states
  // make challenge transaction
  const { commitment: fromPosition, signature: fromSignature } = channelState.penultimateCommitment;
  const { commitment: toPosition, signature: toSignature } = channelState.lastCommitment;
  const transactionRequest = createForceMoveTransaction(
    fromPosition,
    toPosition,
    fromSignature,
    toSignature,
  );
  // initialize transaction state machine
  const returnVal = initializeTransaction(transactionRequest, state.processId, storage);
  const transactionSubmission = returnVal.state;

  // transition to wait for trnasaction
  const newState = waitForTransaction({ ...state, transactionSubmission });
  return { state: newState, storage: returnVal.storage };
}

function challengeDenied(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'ApproveChallenge') {
    return { state, storage };
  }

  state = acknowledgeFailure(state, 'DeclinedByUser');
  return { state, storage };
}

function challengeResponseRecieved(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForResponseOrTimeout') {
    return { state, storage };
  }

  state = acknowledgeResponse(state);
  return { state, storage };
}

function challengeTimedOut(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'WaitForResponseOrTimeout') {
    return { state, storage };
  }

  state = acknowledgeTimeout(state);
  return { state, storage };
}

function challengeTimeoutAcknowledged(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'AcknowledgeTimeout') {
    return { state, storage };
  }

  return { state: successClosed(), storage };
}

function challengeResponseAcknowledged(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'AcknowledgeResponse') {
    return { state, storage };
  }

  return { state: successOpen(), storage };
}

function challengeFailureAcknowledged(state: NonTerminalCState, storage: Storage): ReturnVal {
  if (state.type !== 'AcknowledgeFailure') {
    return { state, storage };
  }

  return { state: failure(state), storage };
}

// Helpers

interface ChannelProps {
  processId: string;
  channelId: string;
  [x: string]: any;
}
function acknowledgeFailure(props: ChannelProps, reason: FailureReason): NonTerminalCState {
  return acknowledgeFailureState({ ...props, reason });
}
