import * as states from "../states";
import * as actions from "../actions";
import * as transactionActions from "../../transaction-submission/actions";
import * as transactionScenarios from "../../transaction-submission/__tests__";
import {ChannelState, ChannelStore} from "../../../channel-store";

import {Wallet} from "ethers";
import {EMPTY_SHARED_DATA, SharedData} from "../../../state";
import * as testScenarios from "../../../__tests__/state-helpers";
import {parseEther} from "ethers/utils";

// ---------
// Test data
// ---------

const {
  asAddress: address,
  asPrivateKey: privateKey,
  trivialAppBytecode,
  channelId,
  libraryAddress,
  participants,
  channelNonce
} = testScenarios;

const gameState1 = testScenarios.appState({turnNum: 19});
const gameState2 = testScenarios.appState({turnNum: 20});
const concludeState1 = testScenarios.appState({turnNum: 51, isFinal: true});
const concludeState2 = testScenarios.appState({turnNum: 52, isFinal: true});

const channelStatus: ChannelState = {
  address,
  privateKey,
  channelId,
  libraryAddress,
  ourIndex: 0,
  participants,
  channelNonce,
  turnNum: concludeState2.state.turnNum,
  funded: true,
  signedStates: [concludeState1, concludeState2]
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus
};

const bytecodeStorage = {
  [libraryAddress]: trivialAppBytecode
};

const notClosedChannelStatus: ChannelState = {
  ...channelStatus,
  signedStates: [gameState1, gameState2],
  turnNum: gameState2.state.turnNum
};

const notClosedChannelState = {
  [channelId]: notClosedChannelStatus
};

const transaction = {};
const withdrawalAddress = Wallet.createRandom().address;
const processId = "process-id.123";
const sharedData: SharedData = {...EMPTY_SHARED_DATA, channelStore, bytecodeStorage};
const withdrawalAmount = parseEther("5").toString();
const transactionSubmissionState = transactionScenarios.preSuccessState;
const props = {
  transaction,
  processId,
  sharedData,
  withdrawalAmount,
  transactionSubmissionState,
  channelId,
  withdrawalAddress
};

// ------
// States
// ------
const waitForApproval = states.waitForApproval(props);
const waitForTransaction = states.waitForTransaction(props);
const waitForAcknowledgement = states.waitForAcknowledgement(props);
const success = states.success({});
const transactionFailure = states.failure({reason: states.FailureReason.TransactionFailure});
const userRejectedFailure = states.failure({reason: states.FailureReason.UserRejected});
const channelNotClosedFailure = states.failure({reason: states.FailureReason.ChannelNotClosed});

// -------
// Actions
// -------

const approved = actions.withdrawalApproved({processId, withdrawalAddress});
const rejected = actions.withdrawalRejected({processId});
const successAcknowledged = actions.withdrawalSuccessAcknowledged({processId});
const transactionConfirmed = transactionActions.transactionConfirmed({processId});
const transactionFailed = transactionActions.transactionFailed({processId});

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: approved
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: successAcknowledged
  },
  success
};

export const withdrawalRejected = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: rejected
  },
  failure: userRejectedFailure
};

export const failedTransaction = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: approved
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionFailed
  },
  failure: transactionFailure
};

export const channelNotClosed = {
  ...props,
  sharedData: {...EMPTY_SHARED_DATA, channelStore: notClosedChannelState},
  failure: channelNotClosedFailure
};
