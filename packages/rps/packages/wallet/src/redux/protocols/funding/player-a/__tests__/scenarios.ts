import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { FundingStrategy } from '../..';
import * as indirectFundingTests from '../../../indirect-funding/player-a/__tests__';
import { channelId, bsAddress } from '../../../../../domain/commitments/__tests__';

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
const targetChannelId = channelId;
const opponentAddress = bsAddress;

const props = {
  processId,
  targetChannelId,
  opponentAddress,
  strategy,
};

// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);

const waitForStrategyResponse = states.waitForStrategyResponse(props);
const waitForFunding = states.waitForFunding({
  ...props,
  fundingState: indirectFundingTests.preSuccessState.state,
});

const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);

// -------
// Shared Data
// -------

const emptySharedData = EMPTY_SHARED_DATA;
const preSuccessSharedData = indirectFundingTests.preSuccessState.store;
const successSharedData = indirectFundingTests.successState.store;
// -------
// Actions
// -------
const strategyChosen = actions.strategyChosen({ processId, strategy });
const strategyApproved = actions.strategyApproved({ processId });
const successConfirmed = actions.fundingSuccessAcknowledged({ processId });
const fundingSuccess = indirectFundingTests.successTrigger;
const strategyRejected = actions.strategyRejected({ processId });
const cancelledByA = actions.cancelled({ processId, by: PlayerIndex.A });
const cancelledByB = actions.cancelled({ processId, by: PlayerIndex.B });

// ---------
// Scenarios
// ---------
export const happyPath = {
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
