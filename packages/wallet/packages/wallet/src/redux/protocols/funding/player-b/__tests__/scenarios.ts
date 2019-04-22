import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import * as walletActions from '../../../../actions';
import * as walletScenarios from '../../../../__tests__/test-scenarios';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForStrategyProposal
//             -> WaitForStrategyApproval
//             -> WaitForFunding
//             -> WaitForPostFundSetup
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
const sharedData = EMPTY_SHARED_DATA;
const { ledgerCommitments } = walletScenarios;

const props = { processId, sharedData, fundingState: 'funding state' as 'funding state' };

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);
const waitForStrategyApproval = states.waitForStrategyApproval(props);
const waitForFunding = states.waitForFunding(props);
const waitForPostFundSetup = states.waitForPostFundSetup(props);
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);
const success = states.success();
const failure = states.failure('User refused');
const failure2 = states.failure('Opponent refused');

// -------
// Actions
// -------
const strategyProposed = actions.strategyProposed(processId);
const strategyApproved = actions.strategyApproved(processId);
const postFundSetupArrived = walletActions.commitmentReceived(
  processId,
  ledgerCommitments.postFundCommitment0,
  'Signature',
);
const successConfirmed = actions.fundingSuccessAcknowledged(processId);
const strategyRejected = actions.strategyRejected(processId);
const cancelledByB = actions.cancelled(processId, PlayerIndex.B);
const cancelledByA = actions.cancelled(processId, PlayerIndex.A);

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  // States
  waitForStrategyProposal,
  waitForStrategyApproval,
  waitForFunding,
  waitForPostFundSetup,
  waitForSuccessConfirmation,
  success,
  // Actions
  strategyProposed,
  strategyApproved,
  postFundSetupArrived,
  successConfirmed,
};

export const rejectedStrategy = {
  ...props,
  // States
  waitForStrategyApproval,
  // Actions
  strategyRejected,
};

export const cancelledByOpponent = {
  ...props,
  // States
  waitForStrategyProposal,
  waitForStrategyApproval,
  failure,
  // Actions
  cancelledByA,
};

export const cancelledByUser = {
  ...props,
  // States
  waitForStrategyProposal,
  waitForStrategyApproval,
  failure2,
  // Actions
  cancelledByB,
};
