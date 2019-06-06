import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { FundingStrategy } from '../../../../../communication';
import * as indirectFundingTests from '../../../indirect-funding/player-b/__tests__';
import { channelId, asAddress } from '../../../../../domain/commitments/__tests__';

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
const strategy: FundingStrategy = 'IndirectFundingStrategy';

const props = {
  targetChannelId,
  processId,
  opponentAddress,
  strategy,
};

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);

const waitForStrategyApproval = states.waitForStrategyApproval(props);
const waitForFunding = states.waitForFunding({
  ...props,
  fundingState: indirectFundingTests.preSuccessState.state,
});
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

// ------
// Shared Data
// ------
const emptySharedData = EMPTY_SHARED_DATA;
const preSuccessSharedData = indirectFundingTests.preSuccessState.store;
const successSharedData = indirectFundingTests.successState.store;

// -------
// Actions
// -------
const strategyProposed = actions.strategyProposed({ processId, strategy });
const strategyApproved = actions.strategyApproved({ processId, strategy });
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = indirectFundingTests.successTrigger;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByB = actions.cancelled({ processId, by: PlayerIndex.B });
const cancelledByA = actions.cancelled({ processId, by: PlayerIndex.A });

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: emptySharedData,
    action: strategyProposed,
  },
  waitForStrategyApproval: {
    state: waitForStrategyApproval,
    sharedData: preSuccessSharedData,
    action: strategyApproved,
  },
  waitForFunding: {
    state: waitForFunding,
    sharedData: preSuccessSharedData,
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
    state: waitForStrategyApproval,
    sharedData: preSuccessSharedData,
    action: strategyRejected,
  },
};

export const cancelledByOpponent = {
  ...props,
  waitForStrategyApproval: {
    state: waitForStrategyApproval,
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
    state: waitForStrategyApproval,
    sharedData: preSuccessSharedData,
    action: cancelledByB,
  },
  waitForStrategyProposal: {
    state: waitForStrategyProposal,
    sharedData: emptySharedData,
    action: cancelledByB,
  },
};
