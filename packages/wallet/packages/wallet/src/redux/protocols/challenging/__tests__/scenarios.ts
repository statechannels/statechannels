import * as states from '../states';
import * as actions from '../actions';
import * as tsScenarios from '../../transaction-submission/__tests__';
import { setChannel, EMPTY_SHARED_DATA } from '../../../state';
import { ChannelState } from '../../../channel-store';
import * as channelScenarios from '../../../__tests__/test-scenarios';
import {
  channelFromCommitments,
  partiallyOpenChannelFromCommitment,
} from '../../../channel-store/channel-state/__tests__';

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
const storage = (channelState: ChannelState) => setChannel(EMPTY_SHARED_DATA, channelState);

const defaults = { processId, channelId, storage: storage(theirTurn) };

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
const waitForResponseOrTimeout = states.waitForResponseOrTimeout(defaults);
const acknowledgeTimeout = states.acknowledgeTimeout(defaults);
const acknowledgeResponse = states.acknowledgeResponse(defaults);
const successOpen = states.successOpen();
const successClosed = states.successClosed();
const acknowledge = (reason: Reason) => states.acknowledgeFailure({ ...defaults, reason });
const failure = (reason: Reason) => states.failure({ reason });

// -------
// Actions
// -------
const challengeApproved = actions.challengeApproved(processId);
const challengeDenied = actions.challengeDenied(processId);
const challengeTimedOut = actions.challengeTimedOut(processId);
const transactionSuccessTrigger = tsScenarios.successTrigger;
const transactionFailureTrigger = tsScenarios.failureTrigger;
const responseReceived = actions.challengeResponseReceived(processId);
const responseAcknowledged = actions.challengeResponseAcknowledged(processId);
const timeoutAcknowledged = actions.challengeTimeoutAcknowledged(processId);
const failureAcknowledged = actions.challengeFailureAcknowledged(processId);

// -------
// Scenarios
// -------
export const opponentResponds = {
  ...defaults,
  // states
  approveChallenge,
  waitForTransaction: waitForTransactionSuccess,
  waitForResponseOrTimeout,
  acknowledgeResponse,
  successOpen,
  // actions
  challengeApproved,
  transactionSuccessTrigger,
  responseReceived,
  responseAcknowledged,
};

// Todo: need to figure out how a `ChallengeTimedOut` action should be triggered
export const challengeTimesOut = {
  ...defaults,
  // states
  waitForResponseOrTimeout,
  acknowledgeTimeout,
  successClosed,
  // actions
  challengeTimedOut,
  timeoutAcknowledged,
};

export const channelDoesntExist = {
  ...defaults,
  storage: EMPTY_SHARED_DATA,
  // states
  acknowledgeFailure: acknowledge('ChannelDoesntExist'),
  failure: failure('ChannelDoesntExist'),
  // actions
  failureAcknowledged,
};

export const channelNotFullyOpen = {
  ...defaults,
  storage: storage(partiallyOpen),
  // states
  acknowledgeFailure: acknowledge('NotFullyOpen'),
  failure: failure('NotFullyOpen'),
  // actions
  failureAcknowledged,
};

export const alreadyHaveLatest = {
  ...defaults,
  storage: storage(ourTurn),
  // states
  acknowledgeFailure: acknowledge('AlreadyHaveLatest'),
  failure: failure('AlreadyHaveLatest'),
  // actions
  failureAcknowledged,
};

export const userDeclinesChallenge = {
  ...defaults,
  // states
  approveChallenge,
  acknowledgeFailure: acknowledge('DeclinedByUser'),
  failure: failure('DeclinedByUser'),
  // actions
  challengeDenied,
  failureAcknowledged,
};

export const receiveCommitmentWhileApproving = {
  ...defaults,
  storage: storage(ourTurn),
  // states
  approveChallenge,
  acknowledgeFailure: acknowledge('LatestWhileApproving'),
  failure: failure('LatestWhileApproving'),
  // actions
  challengeApproved,
  failureAcknowledged,
};

export const transactionFails = {
  ...defaults,
  // states
  waitForTransaction: waitForTransactionFailure,
  acknowledgeFailure: acknowledge('TransactionFailed'),
  failure: failure('TransactionFailed'),
  // actions
  transactionFailureTrigger,
  failureAcknowledged,
};
