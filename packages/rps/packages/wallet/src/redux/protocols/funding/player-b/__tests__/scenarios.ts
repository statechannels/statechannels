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
const waitForStrategyProposal = {
  state: states.waitForStrategyProposal(props),
  store: EMPTY_SHARED_DATA,
};
const waitForStrategyApproval = {
  state: states.waitForStrategyApproval(props),
  store: indirectFundingTests.preSuccessState.store,
};
const waitForFunding = {
  state: states.waitForFunding({
    ...props,
    fundingState: indirectFundingTests.preSuccessState.state,
  }),
  store: indirectFundingTests.preSuccessState.store,
};
const waitForSuccessConfirmation = {
  state: states.waitForSuccessConfirmation(props),
  store: indirectFundingTests.successState.store,
};
const success = states.success();
const failure = states.failure('User refused');
const failure2 = states.failure('Opponent refused');

// -------
// Actions
// -------
const strategyProposed = actions.strategyProposed(processId, strategy);
const strategyApproved = actions.strategyApproved(processId, strategy);
const successConfirmed = actions.fundingSuccessAcknowledged(processId);
const fundingSuccess = indirectFundingTests.successTrigger;
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
    fundingSuccess,
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
