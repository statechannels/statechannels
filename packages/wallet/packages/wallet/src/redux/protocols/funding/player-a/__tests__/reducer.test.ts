import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import {
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
} from '../../../../__tests__/helpers';
import { sendStrategyProposed } from '../../../../../communication';
import { FUNDING_SUCCESS, HIDE_WALLET } from 'magmo-wallet-client';
import { FundingStateType } from '../../states';

describe('indirect strategy chosen', () => {
  const scenario = scenarios.indirectStrategyChosen;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const { state, sharedData, action } = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForStrategyResponse');
    const { processId, opponentAddress } = scenario;
    itSendsThisMessage(
      result,
      sendStrategyProposed(opponentAddress, processId, 'IndirectFundingStrategy'),
    );
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const { state, sharedData, action } = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForIndirectFunding');
  });

  describeScenarioStep(scenario.waitForIndirectFunding, () => {
    const { state, sharedData, action } = scenario.waitForIndirectFunding;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { state, sharedData, action } = scenario.waitForPostFundSetup;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForSuccessConfirmation');
  });

  describeScenarioStep(scenario.waitForSuccessConfirmation, () => {
    const { state, sharedData, action } = scenario.waitForSuccessConfirmation;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.Success');
    itSendsThisMessage(result, FUNDING_SUCCESS);
    itSendsThisDisplayEventType(result, HIDE_WALLET);
  });
});

describe('virtual strategy chosen', () => {
  const scenario = scenarios.virtualStrategyChosen;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const { state, sharedData, action } = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForStrategyResponse');
    const { processId, opponentAddress } = scenario;
    itSendsThisMessage(
      result,
      sendStrategyProposed(opponentAddress, processId, 'VirtualFundingStrategy'),
    );
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const { state, sharedData, action } = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForVirtualFunding');
  });

  describeScenarioStep(scenario.waitForVirtualFunding, () => {
    const { state, sharedData, action } = scenario.waitForVirtualFunding;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForPostFundSetup');
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const { state, sharedData, action } = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.WaitForStrategyChoice');
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const { state, sharedData, action } = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const { state, sharedData, action } = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;
  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const { state, sharedData, action } = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const { state, sharedData, action } = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerA.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.FundingState>,
  type: FundingStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
