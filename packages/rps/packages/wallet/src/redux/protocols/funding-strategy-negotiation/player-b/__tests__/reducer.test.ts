import * as scenarios from './scenarios';
import * as states from '../states';
import { fundingStrategyNegotiationReducer as reducer } from '../reducer';
import { ProtocolStateWithSharedData } from '../../..';
import { itSendsThisMessage, describeScenarioStep } from '../../../../__tests__/helpers';
import { sendStrategyApproved } from '../../../../../communication';
import { FundingStrategyNegotiationStateType } from '../../states';

describe('indirect funding strategy chosen', () => {
  const scenario = scenarios.indirectStrategyChosen;
  const { processId, opponentAddress } = scenario;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Success');

    itSendsThisMessage(
      result,
      sendStrategyApproved(opponentAddress, processId, 'IndirectFundingStrategy'),
    );
  });
});

describe('virtual funding strategy chosen', () => {
  const scenario = scenarios.virtualStrategyChosen;
  const { processId, opponentAddress } = scenario;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.WaitForStrategyApproval');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Success');

    itSendsThisMessage(
      result,
      sendStrategyApproved(opponentAddress, processId, 'VirtualFundingStrategy'),
    );
  });
});

describe('When a strategy is rejected', () => {
  const scenario = scenarios.rejectedStrategy;

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.WaitForStrategyProposal');
  });
});

describe('when cancelled by the opponent', () => {
  const scenario = scenarios.cancelledByOpponent;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Failure');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Failure');
  });
});

describe('when cancelled by the user', () => {
  const scenario = scenarios.cancelledByUser;

  describeScenarioStep(scenario.waitForStrategyProposal, () => {
    const { state, sharedData, action } = scenario.waitForStrategyProposal;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Failure');
  });

  describeScenarioStep(scenario.waitForStrategyApproval, () => {
    const { state, sharedData, action } = scenario.waitForStrategyApproval;

    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, 'FundingStrategyNegotiation.PlayerB.Failure');
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.FundingStrategyNegotiationState>,
  type: FundingStrategyNegotiationStateType,
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
