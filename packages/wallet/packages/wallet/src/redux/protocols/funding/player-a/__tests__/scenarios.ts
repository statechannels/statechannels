import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../../state';
import { FundingStrategy } from '../..';
import * as indirectFundingTests from '../../../indirect-funding/player-a/__tests__';
import * as existingChannelTests from '../../../existing-channel-funding/__tests__';
import {
  channelId,
  bsAddress,
  asAddress,
  ledgerCommitment,
  asPrivateKey,
  appCommitment,
} from '../../../../../domain/commitments/__tests__';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import { bigNumberify } from 'ethers/utils';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForStrategyChoice
//             -> WaitForStrategyResponse
//             -> WaitForFunding
//             -> WaitForSuccessConfirmation
//             -> Success
//
// 2. WaitForStrategyResponse --> |StrategyRejected| WaitForStrategyChoice
//
// 3. WaitForStrategyChoice   --> |Cancelled| Failure
// 4. WaitForStrategyResponse --> |Cancelled| Failure

// ---------
// Test data
// ---------
const processId = 'process-id.123';
const strategy: FundingStrategy = 'IndirectFundingStrategy';
const existingChannelStrategy: FundingStrategy = 'ExistingChannelStrategy';
const targetChannelId = channelId;
const opponentAddress = bsAddress;
const ourAddress = asAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  strategy,
  ourAddress,
};

// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);

const waitForStrategyResponse = states.waitForStrategyResponse(props);
const waitForIndirectFunding = states.waitForFunding({
  ...props,
  fundingState: indirectFundingTests.preSuccessState.state,
});
const waitForExistingChannelFunding = states.waitForFunding({
  ...props,
  fundingState: existingChannelTests.preSuccess.state,
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
// -------
// Shared Data
// -------

const emptySharedData = EMPTY_SHARED_DATA;
const preSuccessSharedData = indirectFundingTests.preSuccessState.store;
const successSharedData = indirectFundingTests.successState.store;
const existingLedgerInitialSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([ledger4, ledger5], asAddress, asPrivateKey),
  channelFromCommitments([app0, app1], asAddress, asPrivateKey),
]);
// -------
// Actions
// -------
const strategyChosen = actions.strategyChosen({ processId, strategy });
const strategyApproved = actions.strategyApproved({ processId });
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = indirectFundingTests.successTrigger;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });

// ---------
// Scenarios
// ---------
export const newChannelHappyPath = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: emptySharedData,
    action: strategyChosen,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: preSuccessSharedData,
    action: strategyApproved,
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
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: existingLedgerInitialSharedData,
    action: strategyChosen,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: existingLedgerInitialSharedData,
    action: strategyApproved,
  },
  waitForFunding: {
    state: waitForExistingChannelFunding,
    sharedData: existingChannelTests.preSuccess.sharedData,
    action: existingChannelTests.preSuccess.action,
  },
  waitForSuccessConfirmation: {
    state: waitForSuccessConfirmation,
    sharedData: successSharedData,
    action: successConfirmed,
  },
};

export const rejectedStrategy = {
  ...props,

  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: preSuccessSharedData,
    action: strategyRejected,
  },
};

export const cancelledByUser = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: emptySharedData,
    action: cancelledByA,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: preSuccessSharedData,
    action: cancelledByA,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyChoice: {
    state: waitForStrategyChoice,
    sharedData: emptySharedData,
    action: cancelledByB,
  },
  waitForStrategyResponse: {
    state: waitForStrategyResponse,
    sharedData: preSuccessSharedData,
    action: cancelledByB,
  },
};
