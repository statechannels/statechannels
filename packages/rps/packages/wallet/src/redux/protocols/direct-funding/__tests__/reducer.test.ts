import { directFundingStateReducer, initialize } from '../reducer';
import * as states from '../states';
import * as scenarios from './scenarios';
import { ProtocolStateWithSharedData } from '../..';
import { itSendsATransaction } from '../../../__tests__/helpers';
import { describeScenarioStep } from '../../../__tests__/helpers';

describe('Player A Happy path', () => {
  const scenario = scenarios.aHappyPath;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForDepositTransaction');
    itSendsATransaction(updatedState);
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const { action, state, sharedData } = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });

  describeScenarioStep(scenario.waitForFundingAndPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForFundingAndPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.FundingSuccess');
  });
});
describe('Player A Happy Path With No Post Fund Setup Exchange', () => {
  const scenario = scenarios.aNoPostFundSetupHappyPath;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForDepositTransaction');
    itSendsATransaction(updatedState);
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const { action, state, sharedData } = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });

  describeScenarioStep(scenario.waitForFundingAndPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForFundingAndPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.FundingSuccess');
  });
});

describe('Player B Happy path', () => {
  const scenario = scenarios.bHappyPath;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.NotSafeToDeposit');
  });
  describeScenarioStep(scenario.notSafeToDeposit, () => {
    const { action, state, sharedData } = scenario.notSafeToDeposit;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForDepositTransaction');
    itSendsATransaction(updatedState);
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const { action, state, sharedData } = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });

  describeScenarioStep(scenario.waitForFundingAndPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForFundingAndPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
    it('marks funding as received', () => {
      expect(
        (updatedState.protocolState as states.WaitForFundingAndPostFundSetup).channelFunded,
      ).toEqual(true);
    });
  });

  describeScenarioStep(scenario.waitForPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.FundingSuccess');
  });
});

describe('Player B Happy Path With No Post Fund Setup Exchange', () => {
  const scenario = scenarios.bNoPostFundSetupsHappyPath;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.NotSafeToDeposit');
  });
  describeScenarioStep(scenario.notSafeToDeposit, () => {
    const { action, state, sharedData } = scenario.notSafeToDeposit;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForDepositTransaction');
    itSendsATransaction(updatedState);
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const { action, state, sharedData } = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });

  describeScenarioStep(scenario.waitForFundingAndPostFundSetup, () => {
    const { action, state, sharedData } = scenario.waitForFundingAndPostFundSetup;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, 'DirectFunding.FundingSuccess');
  });
});

describe('Player A No Deposit Required', () => {
  const scenario = scenarios.depositNotRequired;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForFundingAndPostFundSetup');
  });
});

describe('Player A channel already has some funds', () => {
  const scenario = scenarios.existingOnChainDeposit;
  describe('when initializing', () => {
    const { action, sharedData } = scenario.initialize;
    const updatedState = initialize(action, sharedData);
    itTransitionsTo(updatedState, 'DirectFunding.WaitForDepositTransaction');
  });
});

describe('transaction-fails scenario', () => {
  const scenario = scenarios.transactionFails;
  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const { state, action, sharedData } = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);

    itTransitionsTo(updatedState, 'DirectFunding.FundingFailure');
  });
});

function itTransitionsTo(
  state: ProtocolStateWithSharedData<states.DirectFundingState>,
  type: states.DirectFundingStateType,
) {
  it(`transitions state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
