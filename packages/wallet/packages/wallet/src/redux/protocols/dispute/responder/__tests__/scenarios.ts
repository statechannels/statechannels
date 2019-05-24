import * as states from '../states';
import * as actions from '../actions';
import * as testScenarios from '../../../../__tests__/test-scenarios';
import * as transactionScenarios from '../../../transaction-submission/__tests__';
import { EMPTY_SHARED_DATA, SharedData } from '../../../../state';

import { ChannelState, ChannelStore } from '../../../../channel-store';
import * as transactionActions from '../../../transaction-submission/actions';
import { challengeExpiredEvent } from '../../../../actions';
import {
  preSuccess as defundingPreSuccess,
  preFailure as defundingPreFailure,
} from '../../../defunding/__tests__';

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
  gameCommitment1,
  gameCommitment2,
  gameCommitment3,
} = testScenarios;

const channelStatus: ChannelState = {
  address,
  privateKey,
  channelId,
  libraryAddress,
  ourIndex: 1,
  participants,
  channelNonce,
  funded: true,
  lastCommitment: { commitment: gameCommitment2, signature: '0x0' },
  penultimateCommitment: { commitment: gameCommitment1, signature: '0x0' },
  turnNum: gameCommitment2.turnNum,
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus,
};

const refuteChannelStatus = {
  ...channelStatus,
  lastCommitment: { commitment: gameCommitment3, signature: '0x0' },
  penultimateCommitment: { commitment: gameCommitment2, signature: '0x0' },
  turnNum: gameCommitment2.turnNum,
};
const refuteChannelState = {
  [channelId]: refuteChannelStatus,
};
const transactionSubmissionState = transactionScenarios.preSuccessState;
const processId = 'process-id.123';
const sharedData: SharedData = { ...EMPTY_SHARED_DATA, channelStore };
const defaults = { processId, transactionSubmissionState, sharedData, channelId };

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
const waitForDefund1 = states.waitForDefund({
  ...defaults,
  defundingState: defundingPreSuccess.state,
});
const waitForDefund2 = states.waitForDefund({
  ...defaults,
  defundingState: defundingPreFailure.state,
});
const acknowledgeDefundingSuccess = states.acknowledgeDefundingSuccess({ ...defaults });
const acknowledgeClosedButNotDefunded = states.acknowledgeClosedButNotDefunded({ ...defaults });
// ------
// Actions
// ------
const approve = actions.respondApproved({ processId });
const acknowledge = actions.respondSuccessAcknowledged({ processId });
const responseProvided = actions.responseProvided({
  processId,
  commitment: testScenarios.gameCommitment3,
});
const defundChosen = actions.defundChosen({ processId });
const acknowledged = actions.acknowledged({ processId });
const challengeTimedOut = challengeExpiredEvent(processId, channelId, 1000);

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
    action: acknowledge,
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
    action: acknowledge,
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
    action: acknowledge,
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

export const challengeExpiresChannelDefunded = {
  ...defaults,
  waitForResponse: {
    state: waitForResponse,
    action: challengeTimedOut,
  },
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: defundChosen,
  },
  waitForDefund1: {
    state: waitForDefund1,
    action: defundingPreSuccess.action,
  },
  acknowledgeDefundingSuccess: {
    state: acknowledgeDefundingSuccess,
    action: acknowledged,
  },
};

export const challengeExpiresButChannelNotDefunded = {
  ...defaults,
  waitForDefund2: {
    state: waitForDefund2,
    action: defundingPreFailure.action,
  },
  acknowledgeClosedButNotDefunded: {
    state: acknowledgeClosedButNotDefunded,
    action: acknowledged,
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

export const defundActionComesDuringAcknowledgeTimeout = {
  ...defaults,
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: defundingPreSuccess.action,
  },
};
