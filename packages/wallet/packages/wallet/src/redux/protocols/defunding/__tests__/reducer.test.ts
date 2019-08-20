import * as states from '../states';
import { initialize, defundingReducer } from '../reducer';
import * as scenarios from './scenarios';
import { describeScenarioStep } from '../../../__tests__/helpers';

const itTransitionsTo = (
  result: { protocolState: states.DefundingState },
  type: states.DefundingStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

describe('indirectly funded happy path', () => {
  const scenario = scenarios.indirectlyFundingChannelHappyPath;

  describe('when initializing', () => {
    const { processId, protocolLocator, channelId, sharedData } = scenario.initialize;
    const result = initialize(processId, protocolLocator, channelId, sharedData);
    itTransitionsTo(result, 'Defunding.WaitForLedgerDefunding');
  });
  describeScenarioStep(scenario.waitForLedgerDefunding, () => {
    const { state, action, sharedData } = scenario.waitForLedgerDefunding;
    const result = defundingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Defunding.Success');
  });
});

describe('virtually funded happy path', () => {
  const scenario = scenarios.virtualFundingChannelHappyPath;

  describe('when initializing', () => {
    const { processId, protocolLocator, channelId, sharedData } = scenario.initialize;
    const result = initialize(processId, protocolLocator, channelId, sharedData);
    itTransitionsTo(result, 'Defunding.WaitForVirtualDefunding');
  });
  describeScenarioStep(scenario.waitForVirtualDefunding, () => {
    const { state, action, sharedData } = scenario.waitForVirtualDefunding;
    const result = defundingReducer(state, sharedData, action);

    itTransitionsTo(result, 'Defunding.Success');
  });
});
