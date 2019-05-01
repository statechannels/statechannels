import * as states from '../states';
import * as actions from '../actions';
import { PlayerIndex } from '../../../../types';

import { EMPTY_SHARED_DATA } from '../../../../state';
import { FundingStrategy } from '../../../../../communication';

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
const sharedData = EMPTY_SHARED_DATA;
const targetChannelId = '0x1324';
const opponentAddress = '0xf00';
const strategy: FundingStrategy = 'IndirectFundingStrategy';

const props = {
  processId,
  sharedData,
  fundingState: 'funding state' as 'funding state',
  targetChannelId,
  opponentAddress,
  strategy,
};

// ------
// States
// ------
const waitForStrategyProposal = states.waitForStrategyProposal(props);
const waitForStrategyApproval = states.waitForStrategyApproval(props);
const waitForFunding = states.waitForFunding(props);
const waitForSuccessConfirmation = states.waitForSuccessConfirmation(props);
const success = states.success();
const failure = states.failure('User refused');
const failure2 = states.failure('Opponent refused');

// -------
// Actions
// -------
const strategyProposed = actions.strategyProposed(processId, strategy);
const strategyApproved = actions.strategyApproved(processId, strategy);
const successConfirmed = actions.fundingSuccessAcknowledged(processId);
const strategyRejected = actions.strategyRejected(processId);
const cancelledByB = actions.cancelled(processId, PlayerIndex.B);
const cancelledByA = actions.cancelled(processId, PlayerIndex.A);

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  states: {
    waitForStrategyProposal,
    waitForStrategyApproval,
    waitForFunding,
    waitForSuccessConfirmation,
    success,
  },
  actions: {
    strategyProposed,
    strategyApproved,
    successConfirmed,
  },
};

export const rejectedStrategy = {
  ...props,
  states: {
    waitForStrategyApproval,
  },
  actions: {
    strategyRejected,
  },
};

export const cancelledByOpponent = {
  ...props,
  states: {
    waitForStrategyProposal,
    waitForStrategyApproval,
    failure,
  },
  actions: {
    cancelledByA,
  },
};

export const cancelledByUser = {
  ...props,
  states: {
    waitForStrategyProposal,
    waitForStrategyApproval,
    failure2,
  },
  actions: {
    cancelledByB,
  },
};
