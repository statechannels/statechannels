import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import { itSendsThisMessage } from '../../../../__tests__/helpers';

function whenIn(state) {
  return `when in ${state}`;
}

describe('happyPath', () => {
  const scenario = scenarios.happyPath;
  const sharedData = scenario.sharedData;

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_PROPOSAL), () => {
    const state = scenario.waitForStrategyProposal;
    const action = scenario.strategyProposed;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_APPROVAL);
  });

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_APPROVAL), () => {
    const state = scenario.waitForStrategyApproval;
    const action = scenario.strategyApproved;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_FUNDING);
  });

  describe.skip(whenIn(states.WAIT_FOR_FUNDING), () => {
    // TODO: This test depends on updating the indirect funding protocol
    // const state = scenario.waitForFunding;
    // const action = scenario.indirectFundingSuccess;
    // const result = reducer(state, sharedData, action);
    // itTransitionsTo(result, states.WAIT_FOR_SUCCESS_CONFIRMATION);
  });

  describe.skip(whenIn(states.WAIT_FOR_SUCCESS_CONFIRMATION), () => {
    const state = scenario.waitForSuccessConfirmation;
    const action = scenario.successConfirmed;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;
  const sharedData = scenario.sharedData;

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_APPROVAL), () => {
    const state = scenario.waitForStrategyApproval;
    const action = scenario.strategyRejected;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_PROPOSAL);
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;
  const sharedData = scenario.sharedData;

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_PROPOSAL), () => {
    const state = scenario.waitForStrategyProposal;
    const action = scenario.cancelledByA;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'User refused');
  });

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_APPROVAL), () => {
    const state = scenario.waitForStrategyApproval;
    const action = scenario.cancelledByA;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'Opponent refused');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;
  const sharedData = scenario.sharedData;

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_PROPOSAL), () => {
    const state = scenario.waitForStrategyProposal;
    const action = scenario.cancelledByB;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'User refused');
  });

  describe.skip(whenIn(states.WAIT_FOR_STRATEGY_APPROVAL), () => {
    const state = scenario.waitForStrategyApproval;
    const action = scenario.cancelledByB;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'User refused');
  });
});

function itTransitionsTo(result: ProtocolStateWithSharedData<states.FundingState>, type: string) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
