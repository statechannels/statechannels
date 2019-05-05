import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import { itSendsThisMessage } from '../../../../__tests__/helpers';
import { sendStrategyProposed } from '../../../../../communication';

function whenIn(state) {
  return `when in ${state}`;
}

describe('happyPath', () => {
  const scenario = scenarios.happyPath;

  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const { state, store } = scenario.states.waitForStrategyChoice;
    const action = scenario.actions.strategyChosen;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_RESPONSE);
    const { processId, strategy, opponentAddress } = scenario;
    itSendsThisMessage(result, sendStrategyProposed(opponentAddress, processId, strategy));
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const { state, store } = scenario.states.waitForStrategyResponse;
    const action = scenario.actions.strategyApproved;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.WAIT_FOR_FUNDING);
  });

  describe(whenIn(states.WAIT_FOR_FUNDING), () => {
    const { state, store } = scenario.states.waitForFunding;
    const action = scenario.actions.fundingSuccess;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.WAIT_FOR_SUCCESS_CONFIRMATION);
  });

  describe(whenIn(states.WAIT_FOR_SUCCESS_CONFIRMATION), () => {
    const { state, store } = scenario.states.waitForSuccessConfirmation;
    const action = scenario.actions.successConfirmed;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.SUCCESS);
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const { state, store } = scenario.states.waitForStrategyResponse;
    const action = scenario.actions.strategyRejected;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.WAIT_FOR_STRATEGY_CHOICE);
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;

  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const { state, store } = scenario.states.waitForStrategyChoice;
    const action = scenario.actions.cancelledByB;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const { state, store } = scenario.states.waitForStrategyResponse;
    const action = scenario.actions.cancelledByB;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;
  describe(whenIn(states.WAIT_FOR_STRATEGY_CHOICE), () => {
    const { state, store } = scenario.states.waitForStrategyChoice;
    const action = scenario.actions.cancelledByA;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describe(whenIn(states.WAIT_FOR_STRATEGY_RESPONSE), () => {
    const { state, store } = scenario.states.waitForStrategyResponse;
    const action = scenario.actions.cancelledByA;
    const result = reducer(state, store, action);

    itTransitionsTo(result, states.FAILURE);
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

function itTransitionsTo(result: ProtocolStateWithSharedData<states.FundingState>, type: string) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
