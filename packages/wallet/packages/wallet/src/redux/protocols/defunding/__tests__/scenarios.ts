import * as states from '../states';
import * as withdrawalScenarios from '../../withdrawing/__tests__/scenarios';
import * as testScenarios from '../../../../domain/commitments/__tests__';
import { ChannelState, ChannelStore } from '../../../channel-store';
import { EMPTY_SHARED_DATA, FundingState, setFundingState, setChannels } from '../../../state';
import * as indirectDefunding from '../../indirect-defunding/__tests__';
import { channelFromCommitments } from '../../../channel-store/channel-state/__tests__';
import { bigNumberify } from 'ethers/utils';
const processId = 'process-id.123';

const { asAddress, bsAddress, asPrivateKey, channelId } = testScenarios;

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

const gameCommitment1 = testScenarios.appCommitment({ turnNum: 19 }).commitment;
const gameCommitment2 = testScenarios.appCommitment({ turnNum: 20 }).commitment;
const concludeCommitment1 = testScenarios.appCommitment({ turnNum: 51, isFinal: true });
const concludeCommitment2 = testScenarios.appCommitment({ turnNum: 52, isFinal: true });
const ledger4 = testScenarios.ledgerCommitment({ turnNum: 4, balances: twoThree });
const ledger5 = testScenarios.ledgerCommitment({ turnNum: 5, balances: twoThree });

const channelStatus = channelFromCommitments(
  [concludeCommitment1, concludeCommitment2],
  asAddress,
  asPrivateKey,
);

const ledgerChannelStatus = channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey);

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
  initialize: {
    processId,
    channelId,
    sharedData: setChannels(
      setFundingState(indirectDefunding.initialStore, channelId, {
        directlyFunded: false,
        fundingChannel: testScenarios.ledgerId,
      }),
      [channelStatus],
    ),
  },
  // States
  waitForLedgerDefunding: {
    state: waitForLedgerDefunding,
    action: indirectDefunding.successTrigger,
    sharedData: setChannels(
      setFundingState(indirectDefunding.preSuccessState.sharedData, channelId, {
        directlyFunded: false,
        fundingChannel: testScenarios.ledgerId,
      }),
      [channelStatus, ledgerChannelStatus],
    ),
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
