import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';

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

const props = {
  processId,
  sharedData,
  fundingState: 'funding state' as 'funding state',
  targetChannelId: '0x123',
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
const strategyChosen = actions.strategyChosen(processId);
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
  // States
  waitForStrategyChoice,
  waitForStrategyResponse,
  waitForFunding,
  waitForSuccessConfirmation,
  success,
  // Actions
  strategyChosen,
  strategyApproved,
  successConfirmed,
};

export const rejectedStrategy = {
  ...props,
  // States
  waitForStrategyResponse,
  waitForStrategyChoice,
  // Actions
  strategyRejected,
};

export const cancelledByUser = {
  ...props,
  // States
  waitForStrategyChoice,
  waitForStrategyResponse,
  failure,
  // Actions
  cancelledByA,
};

export const cancelledByOpponent = {
  ...props,
  // States
  waitForStrategyChoice,
  waitForStrategyResponse,
  failure2,
  // Actions
  cancelledByB,
};
