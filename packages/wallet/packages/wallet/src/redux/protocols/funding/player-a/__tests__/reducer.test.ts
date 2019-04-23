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

  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const state = scenario.waitForStrategyChoice;
    const action = scenario.strategyChosen;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_RESPONSE);
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const state = scenario.waitForStrategyResponse;
    const action = scenario.strategyApproved;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_FUNDING);
  });

  describe(whenIn(states.WAIT_FOR_FUNDING), () => {
    // TODO: This test depends on updating the indirect funding protocol
    // const state = scenario.waitForFunding;
    // const action = scenario.indirectFundingSuccess;
    // const result = reducer(state, sharedData, action);
    // itTransitionsTo(result, states.WAIT_FOR_SUCCESS_CONFIRMATION);
  });

  describe(whenIn(states.WAIT_FOR_SUCCESS_CONFIRMATION), () => {
    const state = scenario.waitForSuccessConfirmation;
    const action = scenario.successConfirmed;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;
  const sharedData = scenario.sharedData;

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const state = scenario.waitForStrategyResponse;
    const action = scenario.strategyRejected;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_CHOICE);
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;
  const sharedData = scenario.sharedData;

  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const state = scenario.waitForStrategyChoice;
    const action = scenario.cancelledByB;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const state = scenario.waitForStrategyResponse;
    const action = scenario.cancelledByB;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;
  const sharedData = scenario.sharedData;

  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const state = scenario.waitForStrategyChoice;
    const action = scenario.cancelledByA;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const state = scenario.waitForStrategyResponse;
    const action = scenario.cancelledByA;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

function itTransitionsTo(result: ProtocolStateWithSharedData<states.FundingState>, type: string) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
