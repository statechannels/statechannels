import * as scenarios from './scenarios';
import { initialize, reducer } from '../reducer';
import * as states from '../states';
import { scenarioStepDescription, itSendsTheseCommitments } from '../../../__tests__/helpers';

const itTransitionsTo = (
  result: states.VirtualDefundingState,
  type: states.VirtualDefundingStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

describe('happyPath', () => {
  const scenario = scenarios.happyPath;

  describe('Initialization', () => {
    const result = initialize(scenario.initialize);
    const { appAttributes } = scenario.initialize;
    itTransitionsTo(result.protocolState, 'VirtualDefunding.WaitForJointChannelUpdate');

    itSendsTheseCommitments(result.sharedData, [
      { commitment: { turnNum: 4 } },
      { commitment: { turnNum: 5 } },
      { commitment: { turnNum: 6, appAttributes } },
    ]);
  });

  describe(scenarioStepDescription(scenario.waitForJointChannel), () => {
    const { sharedData, state, action, appAttributes } = scenario.waitForJointChannel;
    const result = reducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'VirtualDefunding.WaitForLedgerChannelUpdate');

    itSendsTheseCommitments(result.sharedData, [
      { commitment: { turnNum: 7 } },
      { commitment: { turnNum: 8, appAttributes } },
    ]);
  });

  describe(scenarioStepDescription(scenario.waitForLedgerChannel), () => {
    const { sharedData, state, action } = scenario.waitForLedgerChannel;
    const result = reducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, 'VirtualDefunding.Success');
  });
});
