import * as states from '../states';
import * as withdrawalScenarios from '../../withdrawing/__tests__/scenarios';
import * as testScenarios from '../../../../domain/commitments/__tests__';
import { ChannelState, ChannelStore } from '../../../channel-store';
import { EMPTY_SHARED_DATA, FundingState } from '../../../state';
import * as indirectDefunding from '../../indirect-defunding/__tests__';
const processId = 'process-id.123';

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

const directlyFundedFundingState: FundingState = {
  [testScenarios.channelId]: {
    directlyFunded: true,
  },
};

const waitForWithdrawal = states.waitForWithdrawal({
  processId,
  channelId,
  withdrawalState: withdrawalScenarios.happyPath.waitForAcknowledgement.state,
});
const waitForWithdrawalFailure = states.waitForWithdrawal({
  processId,
  channelId,
  withdrawalState: withdrawalScenarios.withdrawalRejected.waitForApproval.state,
});

const waitForLedgerDefunding = states.waitForLedgerDefunding({
  processId,
  channelId,
  indirectDefundingState: indirectDefunding.preSuccessState.state,
});

const waitForLedgerFailure = states.waitForLedgerDefunding({
  processId,
  channelId,
  indirectDefundingState: indirectDefunding.preFailureState.state,
});

const channelNotClosedFailure = states.failure({ reason: 'Channel Not Closed' });

export const directlyFundingChannelHappyPath = {
  processId,
  channelId,
  initialize: {
    processId,
    channelId,
    sharedData: {
      ...EMPTY_SHARED_DATA,
      fundingState: directlyFundedFundingState,
      channelStore,
    },
  },

  waitForWithdrawal: {
    state: waitForWithdrawal,
    action: withdrawalScenarios.happyPath.waitForAcknowledgement.action,
    sharedData: {
      ...EMPTY_SHARED_DATA,
      fundingState: directlyFundedFundingState,
      channelStore,
    },
  },
};

export const indirectlyFundingChannelHappyPath = {
  initialize: { processId, channelId, sharedData: indirectDefunding.initialStore },
  // States
  waitForLedgerDefunding: {
    state: waitForLedgerDefunding,
    action: indirectDefunding.successTrigger,
    sharedData: indirectDefunding.preSuccessState.store,
  },
  waitForWithdrawal: {
    state: waitForWithdrawal,
    action: withdrawalScenarios.happyPath.waitForAcknowledgement.action,
    sharedData: {
      ...EMPTY_SHARED_DATA,
      fundingState: directlyFundedFundingState,
      channelStore,
    },
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
  waitForWithdrawal: {
    state: waitForWithdrawalFailure,
    action: withdrawalScenarios.withdrawalRejected.waitForApproval.action,
    sharedData: {
      ...EMPTY_SHARED_DATA,
      fundingState: directlyFundedFundingState,
      channelStore,
    },
  },
};

export const indirectlyFundingFailure = {
  processId,
  channelId,
  // States
  waitForLedgerDefunding: {
    state: waitForLedgerFailure,
    action: indirectDefunding.failureTrigger,
    sharedData: indirectDefunding.preFailureState.store,
  },
};
