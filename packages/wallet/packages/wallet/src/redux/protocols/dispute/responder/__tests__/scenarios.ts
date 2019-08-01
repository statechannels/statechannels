import * as states from '../states';
import * as actions from '../actions';

import * as transactionScenarios from '../../../transaction-submission/__tests__';
import { EMPTY_SHARED_DATA, SharedData } from '../../../../state';

import { ChannelState, ChannelStore } from '../../../../channel-store';
import * as transactionActions from '../../../transaction-submission/actions';
import { challengeExpiredEvent } from '../../../../actions';
import * as testScenarios from '../../../../../domain/commitments/__tests__';
// ---------
// Test data
// ---------

const {
  bsAddress: address,
  bsPrivateKey: privateKey,
  channelId,
  libraryAddress,
  participants,
  channelNonce,
} = testScenarios;
const gameCommitment1 = testScenarios.appCommitment({ turnNum: 19 }).commitment;
const gameCommitment2 = testScenarios.appCommitment({ turnNum: 20 }).commitment;
const gameCommitment3 = testScenarios.appCommitment({ turnNum: 21 }).commitment;

const channelStatus: ChannelState = {
  address,
  privateKey,
  channelId,
  libraryAddress,
  ourIndex: 1,
  participants,
  channelNonce,
  funded: true,
  commitments: [
    { commitment: gameCommitment1, signature: '0x0' },
    { commitment: gameCommitment2, signature: '0x0' },
  ],
  turnNum: gameCommitment2.turnNum,
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus,
};

const refuteChannelStatus: ChannelState = {
  ...channelStatus,
  commitments: [
    { commitment: gameCommitment2, signature: '0x0' },
    { commitment: gameCommitment3, signature: '0x0' },
  ],
  turnNum: gameCommitment2.turnNum,
};
const refuteChannelState = {
  [channelId]: refuteChannelStatus,
};
const transactionSubmissionState = transactionScenarios.preSuccessState;
const processId = 'process-id.123';
const sharedData: SharedData = { ...EMPTY_SHARED_DATA, channelStore };
const defaults = { processId, transactionSubmissionState, sharedData, channelId, expiryTime: 0 };

// ------
// States
// ------
const waitForApprovalRefute = states.waitForApproval({
  ...defaults,
  challengeCommitment: gameCommitment1,
});
const waitForApprovalRespond = states.waitForApproval({
  ...defaults,
  challengeCommitment: gameCommitment1,
});
const waitForApprovalRequiresResponse = states.waitForApproval({
  ...defaults,
  challengeCommitment: gameCommitment3,
});
const waitForTransaction = states.waitForTransaction(defaults);
const waitForAcknowledgement = states.waitForAcknowledgement(defaults);
const waitForResponse = states.waitForResponse(defaults);
const transactionFailedFailure = states.failure({
  reason: states.FailureReason.TransactionFailure,
});
const transactionConfirmed = transactionActions.transactionConfirmed({ processId });
const transactionFailed = transactionActions.transactionFailed({ processId });
const acknowledgeTimeout = states.acknowledgeTimeout(defaults);

// ------
// Actions
// ------
const approve = actions.respondApproved({ processId });
const responseProvided = actions.responseProvided({
  processId,
  commitment: gameCommitment3,
});
const acknowledged = actions.acknowledged({ processId });
const challengeTimedOut = challengeExpiredEvent({
  processId,
  protocolLocator: [],
  channelId,
  timestamp: 1000,
});

// ---------
// Scenarios
// ---------
export const respondWithExistingCommitmentHappyPath = {
  ...defaults,
  challengeCommitment: gameCommitment1,
  waitForApproval: {
    state: waitForApprovalRespond,
    action: approve,
    responseCommitment: gameCommitment2,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed,
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged,
  },
};

export const refuteHappyPath = {
  ...defaults,
  sharedData: { ...defaults.sharedData, channelStore: refuteChannelState },
  challengeCommitment: gameCommitment1,
  waitForApproval: {
    state: waitForApprovalRefute,
    action: approve,
    refuteCommitment: gameCommitment3,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed,
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged,
  },
};

export const requireResponseHappyPath = {
  ...defaults,
  challengeCommitment: gameCommitment2,
  waitForApprovalRequiresResponse: {
    state: waitForApprovalRequiresResponse,
    action: approve,
  },
  waitForResponse: {
    state: waitForResponse,
    action: responseProvided,
    responseCommitment: gameCommitment3,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed,
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged,
  },
};

export const transactionFails = {
  ...defaults,
  waitForApproval: {
    state: waitForApprovalRespond,
    action: approve,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionFailed,
  },
  failure: transactionFailedFailure,
};

export const challengeExpires = {
  ...defaults,
  waitForResponse: {
    state: waitForResponse,
    action: challengeTimedOut,
  },
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: acknowledged,
  },
};

export const challengeExpiresAndDefund = {
  ...defaults,
  defund: {
    state: acknowledgeTimeout,
    action: actions.exitChallenge({ ...defaults }),
  },
};

export const challengeExpiresDuringWaitForTransaction = {
  ...defaults,
  waitForTransaction: {
    state: waitForTransaction,
    action: challengeTimedOut,
  },
};

export const challengeExpiresDuringWaitForApproval = {
  ...defaults,
  waitForApprovalRespond: {
    state: waitForApprovalRespond,
    action: challengeTimedOut,
  },
};
