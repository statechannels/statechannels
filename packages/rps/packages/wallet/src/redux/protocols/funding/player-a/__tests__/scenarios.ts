import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import * as walletActions from '../../../../actions';
import * as walletScenarios from '../../../../__tests__/test-scenarios';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForStrategyChoice
//             -> WaitForStrategyResponse
//             -> WaitForFunding
//             -> WaitForPostFundSetup
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
const { ledgerCommitments } = walletScenarios;

const props = { processId, sharedData, fundingState: 'funding state' as 'funding state' };

// ----
// States
// ------
const waitForStrategyChoice = states.waitForStrategyChoice(props);
const waitForStrategyResponse = states.waitForStrategyResponse(props);
const waitForFunding = states.waitForFunding(props);
const waitForPostFundSetup = states.waitForPostFundSetup(props);
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);
const success = states.success();
const failure = states.failure('User refused');
const failure2 = states.failure('Opponent refused');

// -------
// Actions
// -------
const strategyChosen = actions.strategyChosen(processId);
const strategyApproved = actions.strategyApproved(processId);
const postFundSetupArrived = walletActions.commitmentReceived(
  processId,
  ledgerCommitments.postFundCommitment1,
  'Signature',
);
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
  waitForPostFundSetup,
  waitForSuccessConfirmation,
  success,
  // Actions
  strategyChosen,
  strategyApproved,
  postFundSetupArrived,
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
