import * as states from '../states';
import * as actions from '../actions';
import * as tsScenarios from '../../../transaction-submission/__tests__';
import { setChannel, EMPTY_SHARED_DATA } from '../../../../state';
import { ChannelState } from '../../../../channel-store';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import {
  challengeExpiredEvent,
  respondWithMoveEvent,
  challengeExpirySetEvent,
} from '../../../../actions';
import * as testScenarios from '../../../../../domain/commitments/__tests__';
type Reason = states.FailureReason;

// -----------------
// Channel Scenarios
// -----------------
const { channelId, asAddress: address, asPrivateKey: privateKey } = testScenarios;
const signedCommitment0 = testScenarios.appCommitment({ turnNum: 0 });
const signedCommitment19 = testScenarios.appCommitment({ turnNum: 19 });
const signedCommitment20 = testScenarios.appCommitment({ turnNum: 20 });
const signedCommitment21 = testScenarios.appCommitment({ turnNum: 21 });

const partiallyOpen = channelFromCommitments([signedCommitment0], address, privateKey);
const theirTurn = channelFromCommitments(
  [signedCommitment19, signedCommitment20],
  address,
  privateKey,
);
const ourTurn = channelFromCommitments(
  [signedCommitment20, signedCommitment21],
  address,
  privateKey,
);

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
export const acknowledgeTimeout = states.acknowledgeTimeout(defaults);
export const acknowledgeResponse = states.acknowledgeResponse(defaults);
const acknowledgeFailure = (reason: Reason) => states.acknowledgeFailure({ ...defaults, reason });

// -------
// Actions
// -------
const challengeApproved = actions.challengeApproved({ processId });
const challengeDenied = actions.challengeDenied({ processId });
const challengeTimedOut = challengeExpiredEvent({ processId, channelId, timestamp: 1000 });
const transactionSuccessTrigger = tsScenarios.successTrigger;
const transactionFailureTrigger = tsScenarios.failureTrigger;
const responseReceived = respondWithMoveEvent({
  processId,
  channelId,
  responseCommitment: signedCommitment21.commitment,
  responseSignature: signedCommitment21.signature,
});
const challengeExpirySet = challengeExpirySetEvent({ processId, channelId, expiryTime: 1234 });
export const acknowledged = actions.acknowledged({ processId });

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
  waitForResponseOrTimeoutReceiveResponse: {
    state: waitForResponseOrTimeout,
    action: responseReceived,
    commitment: signedCommitment21,
  },
  waitForResponseOrTimeoutExpirySet: {
    state: waitForResponseOrTimeout,
    action: challengeExpirySet,
    commitment: signedCommitment21,
  },
  acknowledgeResponse: {
    state: acknowledgeResponse,
    action: acknowledged,
  },
};

export const challengeTimesOutAndIsDefunded = {
  ...defaults,
  waitForResponseOrTimeout: {
    state: waitForResponseOrTimeout,
    action: challengeTimedOut,
  },
  defund: {
    state: acknowledgeTimeout,
    action: actions.exitChallenge({ ...defaults }),
  },
};

export const challengeTimesOutAndIsNotDefunded = {
  ...defaults,
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: acknowledged,
  },
};

export const channelDoesntExist = {
  ...defaults,
  sharedData: EMPTY_SHARED_DATA,
  acknowledgeFailure: {
    state: acknowledgeFailure('ChannelDoesntExist'),
    action: acknowledged,
  },
};

export const channelNotFullyOpen = {
  ...defaults,
  sharedData: sharedData(partiallyOpen),
  acknowledgeFailure: {
    state: acknowledgeFailure('NotFullyOpen'),
    action: acknowledged,
  },
};

export const alreadyHaveLatest = {
  ...defaults,
  sharedData: sharedData(ourTurn),
  acknowledgeFailure: {
    state: acknowledgeFailure('AlreadyHaveLatest'),
    action: acknowledged,
  },
};

export const userDeclinesChallenge = {
  ...defaults,
  approveChallenge: {
    state: approveChallenge,
    action: challengeDenied,
  },
  acknowledgeFailure: {
    state: acknowledgeFailure('DeclinedByUser'),
    action: acknowledged,
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
    state: acknowledgeFailure('LatestWhileApproving'),
    action: acknowledged,
  },
};

export const transactionFails = {
  ...defaults,
  waitForTransaction: {
    state: waitForTransactionFailure,
    action: transactionFailureTrigger,
  },
  acknowledgeFailure: {
    state: acknowledgeFailure('TransactionFailed'),
    action: acknowledged,
  },
};
