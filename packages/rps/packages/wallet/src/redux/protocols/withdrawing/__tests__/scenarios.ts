import * as states from '../states';
import * as actions from '../actions';
import * as transactionActions from '../../transaction-submission/actions';
import * as transactionScenarios from '../../transaction-submission/__tests__';
import { ChannelState, ChannelStore } from '../../../channel-store';

import { Wallet } from 'ethers';
import { EMPTY_SHARED_DATA, SharedData } from '../../../state';
import * as web3Utils from 'web3-utils';
import * as testScenarios from '../../../../domain/commitments/__tests__';

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
} = testScenarios;

const gameCommitment1 = testScenarios.appCommitment({ turnNum: 19 }).commitment;
const gameCommitment2 = testScenarios.appCommitment({ turnNum: 20 }).commitment;
const concludeCommitment1 = testScenarios.appCommitment({ turnNum: 51, isFinal: true }).commitment;
const concludeCommitment2 = testScenarios.appCommitment({ turnNum: 52, isFinal: true }).commitment;

const channelStatus: ChannelState = {
  address,
  privateKey,
  channelId,
  libraryAddress,
  ourIndex: 0,
  participants,
  channelNonce,
  turnNum: concludeCommitment2.turnNum,
  funded: true,
  commitments: [
    { commitment: concludeCommitment1, signature: '0x0' },
    { commitment: concludeCommitment2, signature: '0x0' },
  ],
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus,
};

const notClosedChannelStatus: ChannelState = {
  ...channelStatus,
  commitments: [
    { commitment: gameCommitment1, signature: '0x0' },
    { commitment: gameCommitment2, signature: '0x0' },
  ],
  turnNum: gameCommitment2.turnNum,
};

const notClosedChannelState = {
  [channelId]: notClosedChannelStatus,
};

const transaction = {};
const withdrawalAddress = Wallet.createRandom().address;
const processId = 'process-id.123';
const sharedData: SharedData = { ...EMPTY_SHARED_DATA, channelStore };
const withdrawalAmount = web3Utils.toWei('5');
const transactionSubmissionState = transactionScenarios.preSuccessState;
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
const success = states.success({});
const transactionFailure = states.failure({ reason: states.FailureReason.TransactionFailure });
const userRejectedFailure = states.failure({ reason: states.FailureReason.UserRejected });
const channelNotClosedFailure = states.failure({ reason: states.FailureReason.ChannelNotClosed });

// -------
// Actions
// -------

const approved = actions.withdrawalApproved({ processId, withdrawalAddress });
const rejected = actions.withdrawalRejected({ processId });
const successAcknowledged = actions.withdrawalSuccessAcknowledged({ processId });
const transactionConfirmed = transactionActions.transactionConfirmed({ processId });
const transactionFailed = transactionActions.transactionFailed({ processId });

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: approved,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionConfirmed,
  },
  waitForAcknowledgement: {
    state: waitForAcknowledgement,
    action: successAcknowledged,
  },
  success,
};

export const withdrawalRejected = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: rejected,
  },
  failure: userRejectedFailure,
};

export const failedTransaction = {
  ...props,
  waitForApproval: {
    state: waitForApproval,
    action: approved,
  },
  waitForTransaction: {
    state: waitForTransaction,
    action: transactionFailed,
  },
  failure: transactionFailure,
};

export const channelNotClosed = {
  ...props,
  sharedData: { ...EMPTY_SHARED_DATA, channelStore: notClosedChannelState },
  failure: channelNotClosedFailure,
};
