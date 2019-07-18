import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import {
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
} from '../../../../__tests__/helpers';
import { sendStrategyApproved } from '../../../../../communication';
import { FUNDING_SUCCESS, HIDE_WALLET } from 'magmo-wallet-client';
import { FundingStateType } from '../../states';

describe('happy path', () => {
  const scenario = scenarios.happyPath;
  const { processId, opponentAddress } = scenario;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.WaitForStrategyApproval');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.WaitForFunding');
    itSendsThisMessage(result, sendStrategyApproved(opponentAddress, processId));
  });

  describeScenarioStep(scenario.waitForFunding, () => {
    const { state, sharedData, action } = scenario.waitForFunding;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.WaitForPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { state, sharedData, action } = scenario.waitForPostFundSetup;

    const result = reducer(state, sharedData, action);
    itTransitionsTo(result, 'Funding.PlayerB.WaitForSuccessConfirmation');
  });

  describeScenarioStep(scenario.waitForSuccessConfirmation, () => {
    const { state, sharedData, action } = scenario.waitForSuccessConfirmation;

    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.Success');
    itSendsThisMessage(result, FUNDING_SUCCESS);
    itSendsThisDisplayEventType(result, HIDE_WALLET);
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.WaitForStrategyProposal');
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.Failure');
    itSendsThisMessage(result, 'WALLET.FUNDING.FAILURE');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;

    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'Funding.PlayerB.Failure');
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
