import * as states from '../states';
import { initialize, reducer } from '../reducer';
import * as scenarios from './scenarios';
import {
  scenarioStepDescription,
  expectTheseCommitmentsSent,
  itSendsNoMessage,
} from '../../../__tests__/helpers';
import { success, preSuccess } from '../../advance-channel/__tests__';
import { oneTwoThree } from '../../../__tests__/test-scenarios';

const itTransitionsTo = (
  result: states.VirtualFundingState,
  type: states.VirtualFundingStateType,
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

const itTransitionsSubstateTo = (
  result: any,
  substate: states.SubstateDescriptor,
  type: string,
) => {
  it(`transitions to ${type}`, () => {
    expect(result[substate].type).toEqual(type);
  });
};

describe('happyPath', () => {
  const scenario = scenarios.happyPath;

  describe.only('Initialization', () => {
    const { sharedData, args } = scenario.initialize;
    const { protocolState, sharedData: result } = initialize(sharedData, args);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForChannelPreparation');

    expectTheseCommitmentsSent(result, [{ commitment: { turnNum: 0, allocation: oneTwoThree } }]);
    expectTheseCommitmentsSent(result, [{ commitment: { turnNum: 0, allocation: [] } }]);
  });

  describe(scenarioStepDescription(scenario.openGFirst), () => {
    const { state, sharedData, action } = scenario.openGFirst;
    const { protocolState, sharedData: result } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForChannelPreparation');
    itTransitionsSubstateTo(protocolState, 'guarantorChannel', success.state.type);
    itTransitionsSubstateTo(protocolState, 'jointChannel', preSuccess.state.type);
    itSendsNoMessage(result);
  });

  describe(scenarioStepDescription(scenario.openJFirst), () => {
    const { state, sharedData, action } = scenario.openJFirst;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForChannelPreparation');
    itTransitionsSubstateTo(protocolState, 'jointChannel', success.state.type);
    itTransitionsSubstateTo(protocolState, 'guarantorChannel', preSuccess.state.type);
  });

  describe(scenarioStepDescription(scenario.openGSecond), () => {
    const { state, sharedData, action } = scenario.openGSecond;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorFunding');
    itTransitionsSubstateTo(protocolState, 'indirectGuarantorFunding', 'NotImplemented');
  });

  describe(scenarioStepDescription(scenario.openJSecond), () => {
    const { state, sharedData, action } = scenario.openJSecond;
    const { protocolState } = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, 'VirtualFunding.WaitForGuarantorFunding');
    itTransitionsSubstateTo(protocolState, 'indirectGuarantorFunding', 'NotImplemented');
  });
});
