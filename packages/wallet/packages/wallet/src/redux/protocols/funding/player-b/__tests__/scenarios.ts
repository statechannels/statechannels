import * as states from '../states';
import * as actions from '../actions';
import { TwoPartyPlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA, setChannels } from '../../../../state';
import { FundingStrategy } from '../../../../../communication';
import { channelId, asAddress, appCommitment } from '../../../../../domain/commitments/__tests__';
import { bsAddress, bsPrivateKey } from '../../../../../communication/__tests__/commitments';
import { channelFromCommitments } from '../../../../channel-store/channel-state/__tests__';
import { preSuccess as indirectFundingPreSuccess } from '../../../indirect-funding/__tests__';
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
const strategy: FundingStrategy = 'IndirectFundingStrategy';
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

const waitForIndirectFunding = states.waitForFunding({
  ...props,
  fundingState: indirectFundingPreSuccess.state,
});

const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

const twoTwo = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(2).toHexString() },
];

const app2 = appCommitment({ turnNum: 2, balances: twoTwo });
const app3 = appCommitment({ turnNum: 3, balances: twoTwo });
// ------
// Shared Data
// ------

const successSharedData = setChannels(EMPTY_SHARED_DATA, [
  channelFromCommitments([app2, app3], bsAddress, bsPrivateKey),
]);
// -------
// Actions
// -------
const indirectStrategyProposed = actions.strategyProposed({ processId, strategy });
const indirectStrategyApproved = actions.strategyApproved({ processId, strategy });

const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = indirectFundingPreSuccess.action;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByB = actions.cancelled({ processId, by: TwoPartyPlayerIndex.B });
const cancelledByA = actions.cancelled({ processId, by: TwoPartyPlayerIndex.A });

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: indirectStrategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: indirectStrategyApproved,
  },
  waitForFunding: {
    state: waitForIndirectFunding,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: fundingSuccess,
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
    sharedData: indirectFundingPreSuccess.sharedData,
    action: strategyRejected,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: cancelledByA,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByA,
  },
};

export const cancelledByUser = {
  ...props,
  waitForStrategyApproval: {
    state: waitForIndirectStrategyApproval,
    sharedData: indirectFundingPreSuccess.sharedData,
    action: cancelledByB,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: EMPTY_SHARED_DATA,
    action: cancelledByB,
  },
};
