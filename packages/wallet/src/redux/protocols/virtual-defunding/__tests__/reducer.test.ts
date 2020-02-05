import {initialize, reducer} from "../reducer";
import * as states from "../states";
import {scenarioStepDescription, itSendsTheseStates} from "../../../__tests__/helpers";

import * as scenarios from "./scenarios";

const itTransitionsTo = (
  result: states.VirtualDefundingState,
  type: states.VirtualDefundingStateType
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

describe("happyPath", () => {
  const scenario = scenarios.happyPath;

  describe("Initialization", () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result.protocolState, "VirtualDefunding.WaitForJointChannelUpdate");
    const {appData} = scenario.initialize;
    itSendsTheseStates(result.sharedData, [
      {state: {turnNum: 4}},
      {state: {turnNum: 5}},
      {state: {turnNum: 6, appData}}
    ]);
  });

  describe(scenarioStepDescription(scenario.waitForJointChannel), () => {
    const {sharedData, state, action, appData} = scenario.waitForJointChannel;
    const result = reducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, "VirtualDefunding.WaitForLedgerChannelUpdate");

    itSendsTheseStates(result.sharedData, [{state: {turnNum: 7}}, {state: {turnNum: 8, appData}}]);
  });

  describe(scenarioStepDescription(scenario.waitForLedgerChannel), () => {
    const {sharedData, state, action} = scenario.waitForLedgerChannel;
    const result = reducer(state, sharedData, action);
    itTransitionsTo(result.protocolState, "VirtualDefunding.Success");
  });
});
