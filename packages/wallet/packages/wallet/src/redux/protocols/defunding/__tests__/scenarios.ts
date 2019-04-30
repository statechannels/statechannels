import * as states from '../states';
import * as withdrawalScenarios from '../../withdrawing/__tests__/scenarios';
import * as testScenarios from '../../../__tests__/test-scenarios';
import { ChannelState, ChannelStore } from '../../../channel-store';
import { EMPTY_SHARED_DATA, FundingState } from '../../../state';

const processId = 'process-id.123';

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
  lastCommitment: { commitment: concludeCommitment2, signature: '0x0' },
  penultimateCommitment: { commitment: concludeCommitment1, signature: '0x0' },
};

const channelStore: ChannelStore = {
  [channelId]: channelStatus,
};

const notClosedChannelStatus = {
  ...channelStatus,
  lastCommitment: { commitment: gameCommitment2, signature: '0x0' },
  penultimateCommitment: { commitment: gameCommitment1, signature: '0x0' },
  turnNum: gameCommitment2.turnNum,
};

const notClosedChannelState = {
  [channelId]: notClosedChannelStatus,
};

const directlyFundedFundingState: FundingState = {
  [testScenarios.channelId]: {
    directlyFunded: true,
  },
};
const indirectlyFundedFundingState = {
  [testScenarios.channelId]: {
    directlyFunded: false,
    fundingChannel: '0x0',
  },
};
const waitForWithdrawal = states.waitForWithdrawal({
  processId,
  withdrawalState: withdrawalScenarios.happyPath.waitForAcknowledgement,
});
const waitForWithdrawalFailure = states.waitForWithdrawal({
  processId,
  withdrawalState: withdrawalScenarios.withdrawalRejected.waitForApproval,
});

const waitForLedgerDefunding = states.waitForLedgerDefunding({
  processId,
  ledgerDefundingState: 'Success',
});

const success = states.success();
const channelNotClosedFailure = states.failure('Channel Not Closed');
const withdrawalFailure = states.failure('Withdrawal Failure');
const ledgerDefundingFailure = states.failure('Ledger De-funding Failure');

export const directlyFundingChannelHappyPath = {
  processId,
  channelId,
  // States
  waitForWithdrawal,
  success,
  // actions
  withdrawalSuccessAction: withdrawalScenarios.happyPath.successAcknowledged,
  // Shared data
  sharedData: {
    ...EMPTY_SHARED_DATA,
    fundingState: directlyFundedFundingState,
    channelStore,
  },
};

export const indirectlyFundingChannelHappyPath = {
  processId,
  channelId,
  // States
  waitForLedgerDefunding,
  success,
  // actions
  ledgerDefundingSuccessAction: withdrawalScenarios.happyPath.transactionConfirmed,
  // Shared data
  sharedData: {
    ...EMPTY_SHARED_DATA,
    fundingState: indirectlyFundedFundingState,
    channelStore,
  },
};

export const channelNotClosed = {
  processId,
  channelId,
  // States
  waitForWithdrawal,
  failure: channelNotClosedFailure,
  // Shared data
  sharedData: {
    ...EMPTY_SHARED_DATA,
    fundingState: directlyFundedFundingState,
    channelStore: notClosedChannelState,
  },
};

export const directlyFundingFailure = {
  processId,
  channelId,
  // States
  waitForWithdrawal: waitForWithdrawalFailure,
  failure: withdrawalFailure,
  // actions
  withdrawalFailureAction: withdrawalScenarios.withdrawalRejected.rejected,
  // shared data
  sharedData: {
    ...EMPTY_SHARED_DATA,
    fundingState: directlyFundedFundingState,
    channelStore,
  },
};

export const indirectlyFundingFailure = {
  processId,
  channelId,
  // States
  waitForLedgerDefunding,
  failure: ledgerDefundingFailure,
  // actions
  ledgerDefundingFailureAction: withdrawalScenarios.failedTransaction.transactionFailed,
  // Shared data
  sharedData: {
    ...EMPTY_SHARED_DATA,
    fundingState: indirectlyFundedFundingState,
    channelStore,
  },
};
