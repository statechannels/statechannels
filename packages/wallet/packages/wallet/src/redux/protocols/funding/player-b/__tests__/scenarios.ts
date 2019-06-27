import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../../state';
import { FundingStrategy } from '../../../../../communication';
import * as newLedgerFundingTests from '../../../new-ledger-funding/player-b/__tests__';
import {
  channelId,
  asAddress,
  appCommitment,
  ledgerCommitment,
} from '../../../../../domain/commitments/__tests__';
import { bsAddress, bsPrivateKey } from '../../../../../communication/__tests__/commitments';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import * as existingChannelFundingTests from '../../../existing-ledger-funding/__tests__';
import { bigNumberify } from 'ethers/utils';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForStrategyProposal
//             -> WaitForStrategyApproval
//             -> WaitForFunding
//             -> WaitForSuccessConfirmation
//             -> Success
//
// 2. WaitForStrategyApproval --> |StrategyRejected| WaitForStrategyProposal
//
// 3. WaitForStrategyProposal --> |Cancelled| Failure
// 4. WaitForStrategyApproval --> |Cancelled| Failure

// ---------
// Test data
// ---------
const processId = 'process-id.123';
const targetChannelId = channelId;
const opponentAddress = asAddress;
const ourAddress = bsAddress;
const strategy: FundingStrategy = 'NewLedgerFundingStrategy';
const existingChannelStrategy: FundingStrategy = 'ExistingLedgerFundingStrategy';
const props = {
  targetChannelId,
  processId,
  opponentAddress,
  strategy,
  ourAddress,
};

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);

const waitForIndirectStrategyApproval = states.waitForStrategyApproval(props);
const waitForExistingStrategyApproval = states.waitForStrategyApproval({
  ...props,
  strategy: existingChannelStrategy,
});
const waitForIndirectFunding = states.waitForFunding({
  ...props,
  fundingState: newLedgerFundingTests.preSuccessState.state,
});
const waitForExistingFunding = states.waitForFunding({
  ...props,
  fundingState: existingChannelFundingTests.preSuccess.state,
});
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

const twoTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const ledger4 = ledgerCommitment({ turnNum: 4, balances: twoTwo });
const ledger5 = ledgerCommitment({ turnNum: 5, balances: twoTwo });
const app0 = appCommitment({ turnNum: 0, balances: twoTwo });
const app1 = appCommitment({ turnNum: 1, balances: twoTwo });
// ------
// Shared Data
// ------
const emptySharedData = EMPTY_SHARED_DATA;
const preSuccessSharedData = newLedgerFundingTests.preSuccessState.store;
const successSharedData = newLedgerFundingTests.successState.store;
const existingLedgerInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], bsAddress, bsPrivateKey),
  channelFromCommitments([app0, app1], bsAddress, bsPrivateKey),
]);
// -------
// Actions
// -------
const indirectStrategyProposed = actions.strategyProposed({ processId, strategy });
const indirectStrategyApproved = actions.strategyApproved({ processId, strategy });
const existingStrategyProposed = actions.strategyProposed({
  processId,
  strategy: existingChannelStrategy,
});
const existingStrategyApproved = actions.strategyApproved({
  processId,
  strategy: existingChannelStrategy,
});
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = newLedgerFundingTests.successTrigger;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });

// ---------
// Scenarios
// ---------
export const newChannelHappyPath = {
  ...props,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: emptySharedData,
    action: indirectStrategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: preSuccessSharedData,
    action: indirectStrategyApproved,
  },
  waitForFunding: {
    state: waitForIndirectFunding,
    sharedData: preSuccessSharedData,
    action: fundingSuccess,
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed,
  },
};

export const existingChannelHappyPath = {
  ...props,
  strategy: existingChannelStrategy,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: existingLedgerInitialSharedData,
    action: existingStrategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForExistingStrategyApproval,
    sharedData: existingLedgerInitialSharedData,
    action: existingStrategyApproved,
  },
  waitForFunding: {
    state: waitForExistingFunding,
    sharedData: existingChannelFundingTests.preSuccess.sharedData,
    action: existingChannelFundingTests.preSuccess.action,
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed,
  },
};

export const rejectedStrategy = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: preSuccessSharedData,
    action: strategyRejected,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: preSuccessSharedData,
    action: cancelledByA,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: emptySharedData,
    action: cancelledByA,
  },
};

export const cancelledByUser = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: preSuccessSharedData,
    action: cancelledByB,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: emptySharedData,
    action: cancelledByB,
  },
};
