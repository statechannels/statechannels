import * as states from "../states";
import * as actions from "../actions";

import * as transactionScenarios from "../../../transaction-submission/__tests__";
import {EMPTY_SHARED_DATA, SharedData} from "../../../../state";

import {ChannelState, ChannelStore} from "../../../../channel-store";
import * as transactionActions from "../../../transaction-submission/actions";
import {challengeExpiredEvent} from "../../../../actions";
import * as testScenarios from "../../../../__tests__/state-helpers";

// ---------
// Test data
// ---------

const {
  bsAddress: address,
  bsPrivateKey: privateKey,
  channelId,
  libraryAddress,
  participants,
  channelNonce
} = testScenarios;
const gameSignedState1 = testScenarios.appState({turnNum: 19});
const gameSignedState2 = testScenarios.appState({turnNum: 20});
const gameSignedState3 = testScenarios.appState({turnNum: 21});
const gameState1 = gameSignedState1.state;
const gameState2 = gameSignedState2.state;
const gameState3 = gameSignedState3.state;

const channelStatus: ChannelState = {
  address,
  privateKey,
  channelId,
  libraryAddress,
  ourIndex: 1,
  participants,
  channelNonce,
  funded: true,
  signedStates: [gameSignedState1, gameSignedState2],
  turnNum: gameState2.turnNum
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus
};

const refuteChannelStatus: ChannelState = {
  ...channelStatus,
  signedStates: [gameSignedState2, gameSignedState3],
  turnNum: gameState2.turnNum
};
const refuteChannelState = {
  [channelId]: refuteChannelStatus
};
const transactionSubmissionState = transactionScenarios.preSuccessState;
const processId = "process-id.123";
const sharedData: SharedData = {...EMPTY_SHARED_DATA, channelStore};
const defaults = {processId, transactionSubmissionState, sharedData, channelId, expiryTime: 0};

// ------
// States
// ------
const waitForApprovalRefute = states.waitForApproval({
  ...defaults,
  challengeState: gameState1
});
const waitForApprovalRespond = states.waitForApproval({
  ...defaults,
  challengeState: gameState1
});
const waitForApprovalRequiresResponse = states.waitForApproval({
  ...defaults,
  challengeState: gameState3
});
const waitForTransaction = states.waitForTransaction(defaults);
const waitForAcknowledgement = states.waitForAcknowledgement(defaults);
const waitForResponse = states.waitForResponse(defaults);
const transactionFailedFailure = states.failure({
  reason: states.FailureReason.TransactionFailure
});
const transactionConfirmed = transactionActions.transactionConfirmed({processId});
const transactionFailed = transactionActions.transactionFailed({processId});
const acknowledgeTimeout = states.acknowledgeTimeout(defaults);

// ------
// Actions
// ------
const approve = actions.respondApproved({processId});
const responseProvided = actions.responseProvided({
  processId,
  state: gameState3
});
const acknowledged = actions.acknowledged({processId});
const challengeTimedOut = challengeExpiredEvent({
  processId,
  protocolLocator: [],
  channelId,
  timestamp: 1000
});

// ---------
// Scenarios
// ---------
export const respondWithExistingStateHappyPath = {
  ...defaults,
  challengeState: gameState1,
  waitForApproval: {
    state: waitForApprovalRespond,
    action: approve,
    responseState: gameState2
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged
  }
};

export const refuteHappyPath = {
  ...defaults,
  sharedData: {...defaults.sharedData, channelStore: refuteChannelState},
  challengeState: gameState1,
  waitForApproval: {
    state: waitForApprovalRefute,
    action: approve,
    refuteState: gameState3
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged
  }
};

export const requireResponseHappyPath = {
  ...defaults,
  challengeState: gameState2,
  waitForApprovalRequiresResponse: {
    state: waitForApprovalRequiresResponse,
    action: approve
  },
  waitForResponse: {
    state: waitForResponse,
    action: responseProvided,
    responseState: gameState3
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: acknowledged
  }
};

export const transactionFails = {
  ...defaults,
  waitForApproval: {
    state: waitForApprovalRespond,
    action: approve
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionFailed
  },
  failure: transactionFailedFailure
};

export const challengeExpires = {
  ...defaults,
  waitForResponse: {
    state: waitForResponse,
    action: challengeTimedOut
  },
  acknowledgeTimeout: {
    state: acknowledgeTimeout,
    action: acknowledged
  }
};

export const challengeExpiresAndDefund = {
  ...defaults,
  defund: {
    state: acknowledgeTimeout,
    action: actions.exitChallenge({...defaults})
  }
};

export const challengeExpiresDuringWaitForTransaction = {
  ...defaults,
  waitForTransaction: {
    state: waitForTransaction,
    action: challengeTimedOut
  }
};

export const challengeExpiresDuringWaitForApproval = {
  ...defaults,
  waitForApprovalRespond: {
    state: waitForApprovalRespond,
    action: challengeTimedOut
  }
};
