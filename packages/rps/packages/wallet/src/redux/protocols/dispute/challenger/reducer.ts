import {
  ChallengerState as CState,
  NonTerminalChallengerState as NonTerminalCState,
  approveChallenge,
  waitForResponseOrTimeout,
  acknowledgeFailure as acknowledgeFailureState,
  FailureReason,
  waitForTransaction,
  acknowledgeResponse,
  acknowledgeTimeout,
  successClosedAndDefunded,
  successClosedButNotDefunded,
  successOpen,
  failure,
  waitForDefund,
  acknowledgeSuccess,
  AcknowledgeClosedButNotDefunded,
  WaitForDefund,
} from './states';
import { initialize as initializeDefunding, defundingReducer } from '../../defunding/reducer';
import { unreachable } from '../../../../utils/reducer-utils';
import { SharedData, registerChannelToMonitor, checkAndStore } from '../../../state';
import * as actions from './actions';
import { TransactionAction } from '../../transaction-submission/actions';
import {
  isTransactionAction,
  ProtocolAction,
  CHALLENGE_EXPIRED_EVENT,
  REFUTED_EVENT,
  RESPOND_WITH_MOVE_EVENT,
  CHALLENGE_EXPIRY_SET_EVENT,
} from '../../../actions';
import {
  transactionReducer,
  initialize as initializeTransaction,
} from '../../transaction-submission';
import { isSuccess, isFailure } from '../../transaction-submission/states';
import {
  isSuccess as isDefundingSuccess,
  isFailure as isDefundingFailure,
} from '../../defunding/states';
import { getChannel } from '../../../state';
import { createForceMoveTransaction } from '../../../../utils/transaction-generator';
import { isFullyOpen, ourTurn } from '../../../channel-store';
import {
  showWallet,
  hideWallet,
  sendChallengeCommitmentReceived,
  sendChallengeComplete,
  sendConcludeSuccess,
} from '../../reducer-helpers';
import { Commitment, SignedCommitment } from '../../../../domain';
import { isDefundingAction, DefundingAction } from '../../defunding/actions';

const CHALLENGE_TIMEOUT = 5 * 60000;

export interface ReturnVal {
  state: CState;
  sharedData: SharedData;
}

export function challengerReducer(
  state: NonTerminalCState,
  sharedData: SharedData,
  action: ProtocolAction,
): ReturnVal {
  if (!actions.isChallengerAction(action)) {
    console.warn(`Challenging reducer received non-challenging action ${action.type}.`);
    return { state, sharedData };
  }
  if (
    isTransactionAction(action) &&
    (state.type === 'Challenging.WaitForResponseOrTimeout' ||
      state.type === 'Challenging.WaitForTransaction')
  ) {
    return handleTransactionAction(state, sharedData, action);
  }
  if (isDefundingAction(action)) {
    return handleDefundingAction(state, sharedData, action);
  }

  switch (action.type) {
    case actions.CHALLENGE_APPROVED:
      return challengeApproved(state, sharedData);
    case actions.CHALLENGE_DENIED:
      return challengeDenied(state, sharedData);
    case RESPOND_WITH_MOVE_EVENT:
      return challengeResponseReceived(
        state,
        sharedData,
        action.responseCommitment,
        action.responseSignature,
      );
    case REFUTED_EVENT:
      return refuteReceived(state, sharedData);
    case CHALLENGE_EXPIRED_EVENT:
      return challengeTimedOut(state, sharedData);
    case CHALLENGE_EXPIRY_SET_EVENT:
      return handleChallengeCreatedEvent(state, sharedData, action.expiryTime);
    case actions.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return challengeResponseAcknowledged(state, sharedData);
    case actions.CHALLENGE_FAILURE_ACKNOWLEDGED:
      return challengeFailureAcknowledged(state, sharedData);
    case actions.DEFUND_CHOSEN:
      return defundChosen(state, sharedData);
    case actions.ACKNOWLEDGED:
      return acknowledged(state, sharedData);
    default:
      return unreachable(action);
  }
}

export function initialize(
  channelId: string,
  processId: string,
  sharedData: SharedData,
): ReturnVal {
  const channelState = getChannel(sharedData, channelId);
  const props = { processId, channelId };

  if (!channelState) {
    return {
      state: acknowledgeFailure(props, 'ChannelDoesntExist'),
      sharedData: showWallet(sharedData),
    };
  }

  if (!isFullyOpen(channelState)) {
    return { state: acknowledgeFailure(props, 'NotFullyOpen'), sharedData: showWallet(sharedData) };
  }

  if (ourTurn(channelState)) {
    // if it's our turn we don't need to challenge
    return {
      state: acknowledgeFailure(props, 'AlreadyHaveLatest'),
      sharedData: showWallet(sharedData),
    };
  }
  sharedData = registerChannelToMonitor(sharedData, processId, channelId);
  return { state: approveChallenge({ channelId, processId }), sharedData: showWallet(sharedData) };
}

function handleChallengeCreatedEvent(
  state: NonTerminalCState,
  sharedData: SharedData,
  expiryTime: number,
): ReturnVal {
  if (
    state.type !== 'Challenging.WaitForResponseOrTimeout' &&
    state.type !== 'Challenging.WaitForTransaction'
  ) {
    return { state, sharedData };
  } else {
    const updatedState = { ...state, expiryTime };
    return { state: updatedState, sharedData };
  }
}

function handleTransactionAction(
  state: NonTerminalCState,
  sharedData: SharedData,
  action: TransactionAction,
): ReturnVal {
  if (state.type !== 'Challenging.WaitForTransaction') {
    return { state, sharedData };
  }
  const transactionSubmission = state.transactionSubmission;

  const retVal = transactionReducer(transactionSubmission, sharedData, action);
  const transactionState = retVal.state;

  if (isSuccess(transactionState)) {
    // We use an estimate if we haven't received a real expiry time yet.
    const expiryTime = state.expiryTime || new Date(Date.now() + CHALLENGE_TIMEOUT).getTime();
    state = waitForResponseOrTimeout({ ...state, expiryTime });
  } else if (isFailure(transactionState)) {
    state = acknowledgeFailure(state, 'TransactionFailed');
  } else {
    // update the transaction state
    state = { ...state, transactionSubmission: transactionState };
  }

  return { state, sharedData: retVal.storage };
}

function handleDefundingAction(
  state: NonTerminalCState,
  sharedData: SharedData,
  action: DefundingAction,
): ReturnVal {
  if (
    state.type !== 'Challenging.WaitForDefund' &&
    state.type !== 'Challenging.AcknowledgeTimeout'
  ) {
    return { state, sharedData };
  }
  if (state.type === 'Challenging.AcknowledgeTimeout') {
    const updatedState = transitionToWaitForDefunding(state, sharedData);
    state = updatedState.state;
    sharedData = updatedState.sharedData;
  }
  const retVal = defundingReducer(state.defundingState, sharedData, action);
  const defundingState = retVal.protocolState;

  if (isDefundingSuccess(defundingState)) {
    state = acknowledgeSuccess({ ...state });
  } else if (isDefundingFailure(defundingState)) {
    state = AcknowledgeClosedButNotDefunded(state);
  } else {
    // update the transaction state
    state = { ...state, defundingState };
  }
  return { state, sharedData: retVal.sharedData };
}

function challengeApproved(state: NonTerminalCState, sharedData: SharedData): ReturnVal {
  if (state.type !== 'Challenging.ApproveChallenge') {
    return { state, sharedData };
  }
  const channelState = getChannel(sharedData, state.channelId);

  // These shouldn't have changed but the type system doesn't know that. In any case, we
  // might as well be safe. And type-safe...
  if (!channelState) {
    return { state: acknowledgeFailure(state, 'ChannelDoesntExist'), sharedData };
  }
  if (!isFullyOpen(channelState)) {
    return { state: acknowledgeFailure(state, 'NotFullyOpen'), sharedData };
  }

  if (ourTurn(channelState)) {
    // if it's our turn now, a commitment must have arrived while we were approving
    return { state: acknowledgeFailure(state, 'LatestWhileApproving'), sharedData };
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
  const returnVal = initializeTransaction(transactionRequest, state.processId, sharedData);
  const transactionSubmission = returnVal.state;

  // transition to wait for transaction
  const newState = waitForTransaction({ ...state, transactionSubmission });
  return { state: newState, sharedData: returnVal.storage };
}

function challengeDenied(state: NonTerminalCState, sharedData: SharedData): ReturnVal {
  if (state.type !== 'Challenging.ApproveChallenge') {
    return { state, sharedData };
  }

  state = acknowledgeFailure(state, 'DeclinedByUser');
  return { state, sharedData };
}

function refuteReceived(state: NonTerminalCState, sharedData: SharedData): ReturnVal {
  if (state.type !== 'Challenging.WaitForResponseOrTimeout') {
    return { state, sharedData };
  }

  state = acknowledgeResponse(state);
  return { state, sharedData };
}

function challengeResponseReceived(
  state: NonTerminalCState,
  sharedData: SharedData,
  challengeCommitment: Commitment,
  challengeSignature: string,
): ReturnVal {
  if (state.type !== 'Challenging.WaitForResponseOrTimeout') {
    return { state, sharedData };
  }

  state = acknowledgeResponse(state);
  sharedData = sendChallengeCommitmentReceived(sharedData, challengeCommitment);

  const signedCommitment: SignedCommitment = {
    commitment: challengeCommitment,
    signature: challengeSignature,
  };
  const checkResult = checkAndStore(sharedData, signedCommitment);
  if (checkResult.isSuccess) {
    return { state, sharedData: checkResult.store };
  }

  return { state, sharedData };
}

function challengeTimedOut(state: NonTerminalCState, sharedData: SharedData): ReturnVal {
  if (state.type !== 'Challenging.WaitForResponseOrTimeout') {
    return { state, sharedData };
  }

  state = acknowledgeTimeout(state);
  return { state, sharedData };
}

function challengeResponseAcknowledged(
  state: NonTerminalCState,
  sharedData: SharedData,
): ReturnVal {
  if (state.type !== 'Challenging.AcknowledgeResponse') {
    return { state, sharedData };
  }
  sharedData = sendChallengeComplete(hideWallet(sharedData));
  return { state: successOpen(), sharedData };
}

function challengeFailureAcknowledged(state: NonTerminalCState, sharedData: SharedData): ReturnVal {
  if (state.type !== 'Challenging.AcknowledgeFailure') {
    return { state, sharedData };
  }

  return { state: failure(state), sharedData: hideWallet(sharedData) };
}

function defundChosen(state: NonTerminalCState, sharedData: SharedData) {
  if (state.type !== 'Challenging.AcknowledgeTimeout') {
    return { state, sharedData };
  }
  return transitionToWaitForDefunding(state, sharedData);
}
function acknowledged(state: NonTerminalCState, sharedData: SharedData) {
  if (state.type === 'Challenging.AcknowledgeClosedButNotDefunded') {
    return {
      state: successClosedButNotDefunded(),
      sharedData: sendConcludeSuccess(hideWallet(sharedData)),
    };
    // From the point of view of the app, it is as if we have concluded
  }
  if (state.type === 'Challenging.AcknowledgeSuccess') {
    return {
      state: successClosedAndDefunded(),
      sharedData: sendConcludeSuccess(hideWallet(sharedData)),
    };
    // From the point of view of the app, it is as if we have concluded
  }
  return { state, sharedData };
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

const transitionToWaitForDefunding = (
  state: NonTerminalCState,
  sharedData: SharedData,
): { state: WaitForDefund; sharedData: SharedData } => {
  // initialize defunding state machine
  const protocolStateWithSharedData = initializeDefunding(
    state.processId,
    state.channelId,
    sharedData,
  );
  const defundingState = protocolStateWithSharedData.protocolState;
  sharedData = protocolStateWithSharedData.sharedData;
  return {
    state: waitForDefund({
      ...state,
      defundingState,
    }),
    sharedData,
  };
};
