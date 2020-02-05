import {describeScenarioStep, itSendsThisDisplayEventType} from "../../../__tests__/helpers";
import {closeLedgerChannelReducer, initialize} from "../reducer";

import * as states from "../states";

import * as scenarios from "./scenarios";

const itTransitionsTo = (
  result: {protocolState: states.CloseLedgerChannelState},
  type: states.CloseLedgerChannelStateType
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

describe("happy path", () => {
  const scenario = scenarios.happyPath;

  describe("when initializing", () => {
    const {processId, channelId, sharedData} = scenario.initialize;
    const result = initialize(processId, channelId, sharedData, true);
    itTransitionsTo(result, "CloseLedgerChannel.WaitForConclude");
  });
  describeScenarioStep(scenario.waitForConclude, () => {
    const {state, action, sharedData} = scenario.waitForConclude;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, "CloseLedgerChannel.WaitForWithdrawal");
  });

  describeScenarioStep(scenario.waitForWithdrawal, () => {
    const {state, action, sharedData} = scenario.waitForWithdrawal;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, "CloseLedgerChannel.Success");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("channel already concluded", () => {
  const scenario = scenarios.alreadyConcluded;

  describe("when initializing", () => {
    const {processId, channelId, sharedData} = scenario.initialize;
    const result = initialize(processId, channelId, sharedData, true);
    itTransitionsTo(result, "CloseLedgerChannel.WaitForWithdrawal");
  });
  describeScenarioStep(scenario.waitForWithdrawal, () => {
    const {state, action, sharedData} = scenario.waitForWithdrawal;
    const result = closeLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(result, "CloseLedgerChannel.Success");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("channel in use failure", () => {
  const scenario = scenarios.channelInUseFailure;

  describe("when initializing", () => {
    const {processId, channelId, sharedData} = scenario.initialize;
    const result = initialize(processId, channelId, sharedData, true);
    itTransitionsTo(result, "CloseLedgerChannel.Failure");
  });
});
