import * as states from '../states';
import * as actions from '../actions';
import * as transactionActions from '../../transaction-submission/actions';
import { SharedData } from '../..';
import * as transactionScenarios from '../../transaction-submission/__tests__/scenarios';
import {
  ChannelStatus,
  RUNNING,
  WAIT_FOR_UPDATE,
  ChannelState,
} from '../../../channel-state/state';
import * as testScenarios from '../../../__tests__/test-scenarios';
import { Wallet } from 'ethers';
import { emptyState } from '../../../state';
import web3Utils from 'web3-utils';

// ---------
// Test data
// ---------

const {
  asAddress: address,
  asPrivateKey: privateKey,
  channelId,
  libraryAddress,
  participants,
  channelNonce,
  concludeCommitment1,
  concludeCommitment2,
  gameCommitment1,
  gameCommitment2,
} = testScenarios;

const channelStatus: ChannelStatus = {
  address,
  privateKey,
  stage: RUNNING,
  type: WAIT_FOR_UPDATE,
  channelId,
  libraryAddress,
  ourIndex: 0,
  participants,
  channelNonce,
  turnNum: concludeCommitment2.turnNum,
  funded: true,
  lastCommitment: { commitment: concludeCommitment2, signature: '0x0' },
  penultimateCommitment: { commitment: concludeCommitment1, signature: '0x0' },
};

const channelState: ChannelState = {
  initializingChannels: {},
  initializedChannels: {
    [channelId]: channelStatus,
  },
};

const notClosedChannelStatus = {
  ...channelStatus,
  lastCommitment: { commitment: gameCommitment2, signature: '0x0' },
  penultimateCommitment: { commitment: gameCommitment1, signature: '0x0' },
  turnNum: gameCommitment2.turnNum,
};

const notClosedChannelState = {
  initializingChannels: {},
  initializedChannels: {
    [channelId]: notClosedChannelStatus,
  },
};

const transaction = {};
const withdrawalAddress = Wallet.createRandom().address;
const processId = 'process-id.123';
const sharedData: SharedData = { ...emptyState, channelState };
const withdrawalAmount = web3Utils.toWei('5');
const transactionSubmissionState = transactionScenarios.happyPath.waitForConfirmation;
const props = {
  transaction,
  processId,
  sharedData,
  withdrawalAmount,
  transactionSubmissionState,
  channelId,
  withdrawalAddress,
};

// ------
// States
// ------
const waitForApproval = states.waitForApproval(props);
const waitForTransaction = states.waitForTransaction(props);
const waitForAcknowledgement = states.waitForAcknowledgement(props);
const success = states.success();
const transactionFailure = states.failure(states.FailureReason.TransactionFailure);
const userRejectedFailure = states.failure(states.FailureReason.UserRejected);
const channelNotClosedFailure = states.failure(states.FailureReason.ChannelNotClosed);

// -------
// Actions
// -------

const approved = actions.withdrawalApproved(processId, channelId);
const rejected = actions.withdrawalRejected(processId);
const successAcknowledged = actions.withdrawalSuccessAcknowledged(processId);
const transactionConfirmed = transactionActions.transactionConfirmed(processId);
const transactionFailed = transactionActions.transactionFailed(processId);

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  // States
  waitForApproval,
  waitForTransaction,
  waitForAcknowledgement,
  success,
  // Actions
  approved,
  transactionConfirmed,
  successAcknowledged,
};

export const withdrawalRejected = {
  ...props,
  // States
  waitForApproval,
  failure: userRejectedFailure,
  // Actions
  rejected,
};

export const failedTransaction = {
  ...props,
  // States
  waitForApproval,
  waitForTransaction,
  failure: transactionFailure,
  // Actions
  approved,
  transactionFailed,
};

export const channelNotClosed = {
  ...props,
  sharedData: { ...emptyState, channelState: notClosedChannelState },
  // States
  failure: channelNotClosedFailure,
  // Actions
  approved,
};
