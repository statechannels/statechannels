import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../..';
import {
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
} from '../../../__tests__/helpers';
import { FUNDING_SUCCESS, HIDE_WALLET } from 'magmo-wallet-client';

describe('ledger funding', () => {
  const scenario = scenarios.ledgerFunding;

  describeScenarioStep(scenario.waitForStrategyNegotiation, () => {
    const { state, sharedData, action } = scenario.waitForStrategyNegotiation;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.WaitForLedgerFunding');
  });

  describeScenarioStep(scenario.waitForLedgerFunding, () => {
    const { state, sharedData, action } = scenario.waitForLedgerFunding;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { state, sharedData, action } = scenario.waitForPostFundSetup;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.WaitForSuccessConfirmation');
  });

  describeScenarioStep(scenario.waitForSuccessConfirmation, () => {
    const { state, sharedData, action } = scenario.waitForSuccessConfirmation;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.Success');
    itSendsThisMessage(result, FUNDING_SUCCESS);
    itSendsThisDisplayEventType(result, HIDE_WALLET);
  });
});

describe('virtual funding', () => {
  const scenario = scenarios.virtualFunding;

  describeScenarioStep(scenario.waitForStrategyNegotiation, () => {
    const { state, sharedData, action } = scenario.waitForStrategyNegotiation;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.WaitForVirtualFunding');
  });

  describeScenarioStep(scenario.waitForVirtualFunding, () => {
    const { state, sharedData, action } = scenario.waitForVirtualFunding;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.WaitForPostFundSetup');
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.FundingState>,
  type: states.FundingStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
