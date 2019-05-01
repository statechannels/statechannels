import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { FundingStrategy } from '../..';

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
const sharedData = EMPTY_SHARED_DATA;
const strategy: FundingStrategy = 'IndirectFundingStrategy';
const targetChannelId = '0x123';
const opponentAddress = '0xf00';

const props = {
  processId,
  sharedData,
  fundingState: 'funding state' as 'funding state',
  targetChannelId,
  opponentAddress,
  strategy,
};

// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);
const waitForStrategyResponse = states.waitForStrategyResponse(props);
const waitForFunding = states.waitForFunding(props);
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);
const success = states.success();
const failure = states.failure('User refused');
const failure2 = states.failure('Opponent refused');

// -------
// Actions
// -------
const strategyChosen = actions.strategyChosen(processId, strategy);
const strategyApproved = actions.strategyApproved(processId);
const successConfirmed = actions.fundingSuccessAcknowledged(processId);

const strategyRejected = actions.strategyRejected(processId);
const cancelledByA = actions.cancelled(processId, PlayerIndex.A);
const cancelledByB = actions.cancelled(processId, PlayerIndex.B);

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  states: {
    waitForStrategyChoice,
    waitForStrategyResponse,
    waitForFunding,
    waitForSuccessConfirmation,
    success,
  },
  actions: {
    strategyChosen,
    strategyApproved,
    successConfirmed,
  },
};

export const rejectedStrategy = {
  ...props,
  states: {
    waitForStrategyResponse,
    waitForStrategyChoice,
  },
  actions: { strategyRejected },
};

export const cancelledByUser = {
  ...props,
  states: { waitForStrategyChoice, waitForStrategyResponse, failure },
  actions: { cancelledByA },
};

export const cancelledByOpponent = {
  ...props,
  states: {
    waitForStrategyChoice,
    waitForStrategyResponse,
    failure2,
  },
  actions: {
    cancelledByB,
  },
};
