import * as states from '../states';
import * as actions from '../actions';
import * as tsScenarios from '../../../transaction-submission/__tests__';
import { setChannel, EMPTY_SHARED_DATA } from '../../../../state';
import { ChannelState } from '../../../../channel-store';
import * as channelScenarios from '../../../../__tests__/test-scenarios';
import {
  channelFromCommitments,
  partiallyOpenChannelFromCommitment,
} from '../../../../channel-store/channel-state/__tests__';
import {
  challengeExpiredEvent,
  respondWithMoveEvent,
  challengeExpirySetEvent,
} from '../../../../actions';
import {
  preSuccessState as defundingPreSuccessState,
  successTrigger as defundingSuccessTrigger,
  preFailureState as defundingPreFailureState,
  failureTrigger as defundingFailureTrigger,
} from '../../../defunding/__tests__';

type Reason = states.FailureReason;

// -----------------
// Channel Scenarios
// -----------------
const { channelId, asAddress: address, asPrivateKey: privateKey } = channelScenarios;

const {
  signedCommitment0,
  signedCommitment19,
  signedCommitment20,
  signedCommitment21,
} = channelScenarios;

const partiallyOpen = partiallyOpenChannelFromCommitment(signedCommitment0, address, privateKey);
const theirTurn = channelFromCommitments(
  signedCommitment19,
  signedCommitment20,
  address,
  privateKey,
);
const ourTurn = channelFromCommitments(signedCommitment20, signedCommitment21, address, privateKey);

// --------
// Defaults
// --------
const processId = 'processId';
const tsPreSuccess = tsScenarios.preSuccessState;
const tsPreFailure = tsScenarios.preFailureState;
const sharedData = (channelState: ChannelState) => setChannel(EMPTY_SHARED_DATA, channelState);

const defaults = { processId, channelId, sharedData: sharedData(theirTurn) };

// ------
// States
// ------
const approveChallenge = states.approveChallenge(defaults);
const waitForTransactionSuccess = states.waitForTransaction({
  ...defaults,
  transactionSubmission: tsPreSuccess,
});
const waitForTransactionFailure = states.waitForTransaction({
  ...defaults,
  transactionSubmission: tsPreFailure,
});
const waitForResponseOrTimeout = states.waitForResponseOrTimeout({ ...defaults, expiryTime: 0 });
const acknowledgeTimeout = states.acknowledgeTimeout(defaults);
const acknowledgeResponse = states.acknowledgeResponse(defaults);
const successOpen = states.successOpen();
const acknowledge = (reason: Reason) => states.acknowledgeFailure({ ...defaults, reason });
const waitForDefund1 = states.waitForDefund({
  ...defaults,
  defundingState: defundingPreSuccessState,
});
const waitForDefund2 = states.waitForDefund({
  ...defaults,
  defundingState: defundingPreFailureState,
});
const acknowledgeSuccess = states.acknowledgeSuccess({ ...defaults });
const acknowledgeClosedButNotDefunded = states.AcknowledgeClosedButNotDefunded({ ...defaults });

// -------
// Actions
// -------
const challengeApproved = actions.challengeApproved(processId);
const challengeDenied = actions.challengeDenied(processId);
const challengeTimedOut = challengeExpiredEvent(processId, channelId, 1000);
const transactionSuccessTrigger = tsScenarios.successTrigger;
const transactionFailureTrigger = tsScenarios.failureTrigger;
const responseReceived = respondWithMoveEvent(
  processId,
  channelId,
  signedCommitment21.commitment,
  signedCommitment21.signature,
);
const responseAcknowledged = actions.challengeResponseAcknowledged(processId);
const failureAcknowledged = actions.challengeFailureAcknowledged(processId);
const challengeExpirySet = challengeExpirySetEvent(processId, channelId, 1234);
const defundChosen = actions.defundChosen(processId);
const acknowledged = actions.acknowledged(processId);
// -------
// Scenarios
// -------
export const opponentResponds = {
  ...defaults,
  approveChallenge: {
    state: approveChallenge,
    action: challengeApproved,
  },
  waitForTransaction: {
    state: waitForTransactionSuccess,
    action: transactionSuccessTrigger,
    action2: challengeExpirySet,
  },
  waitForResponseOrTimeout: {
    state: waitForResponseOrTimeout,
    action1: challengeExpirySet,
    action2: responseReceived,
    commitment: signedCommitment21,
  },
  acknowledgeResponse: {
    state: acknowledgeResponse,
    action: responseAcknowledged,
  },
  successOpen: {
    state: successOpen,
  },
};

// Todo: need to figure out how a `ChallengeTimedOut` action should be triggered
export const challengeTimesOutAndIsDefunded = {
  ...defaults,
  waitForResponseOrTimeout: {
    state: waitForResponseOrTimeout,
    action: challengeTimedOut,
  },
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: defundChosen,
  },
  challengerWaitForDefund: {
    state: waitForDefund1,
    action: defundingSuccessTrigger,
  },
  acknowledgeSuccess: {
    state: acknowledgeSuccess,
    action: acknowledged,
  },
};

export const challengeTimesOutAndIsNotDefunded = {
  ...defaults,
  challengerWaitForDefund: {
    state: waitForDefund2,
    action: defundingFailureTrigger,
  },
  acknowledgeClosedButNotDefunded: {
    state: acknowledgeClosedButNotDefunded,
    action: acknowledged,
  },
};

export const channelDoesntExist = {
  ...defaults,
  sharedData: EMPTY_SHARED_DATA,
  acknowledgeFailure: {
    state: acknowledge('ChannelDoesntExist'),
    action: failureAcknowledged,
  },
};

export const channelNotFullyOpen = {
  ...defaults,
  sharedData: sharedData(partiallyOpen),
  acknowledgeFailure: {
    state: acknowledge('NotFullyOpen'),
    action: failureAcknowledged,
  },
};

export const alreadyHaveLatest = {
  ...defaults,
  sharedData: sharedData(ourTurn),
  acknowledgeFailure: {
    state: acknowledge('AlreadyHaveLatest'),
    action: failureAcknowledged,
  },
};

export const userDeclinesChallenge = {
  ...defaults,
  approveChallenge: {
    state: approveChallenge,
    action: challengeDenied,
  },
  acknowledgeFailure: {
    state: acknowledge('DeclinedByUser'),
    action: failureAcknowledged,
  },
};

export const receiveCommitmentWhileApproving = {
  ...defaults,
  sharedData: sharedData(ourTurn),
  approveChallenge: {
    state: approveChallenge,
    action: challengeApproved,
  },
  acknowledgeFailure: {
    state: acknowledge('LatestWhileApproving'),
    action: failureAcknowledged,
  },
};

export const transactionFails = {
  ...defaults,
  waitForTransaction: {
    state: waitForTransactionFailure,
    action: transactionFailureTrigger,
  },
  acknowledgeFailure: {
    state: acknowledge('TransactionFailed'),
    action: failureAcknowledged,
  },
};

export const defundActionComesDuringAcknowledgeTimeout = {
  ...defaults,
  sharedData: sharedData(ourTurn),
  acknowledgeTimeout,

  defundingSuccessTrigger,
};
