import {ConcludingStateType} from "../states";

import {
  describeScenarioStep,
  itSendsThisDisplayEventType,
  itRelaysThisAction
} from "../../../__tests__/helpers";
import {concludingReducer, initialize} from "../reducer";
import {concludeInstigated} from "../../../../communication";

import * as scenarios from "./scenarios";

describe("Opponent Concluded Happy Path", () => {
  const scenario = scenarios.opponentConcludedHappyPath;

  describe("when initializing", () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result, "Concluding.WaitForConclude");
  });

  describeScenarioStep(scenario.waitForConclude, () => {
    const {action, state, sharedData} = scenario.waitForConclude;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.WaitForDefund");
  });

  describeScenarioStep(scenario.waitForDefund, () => {
    const {action, state, sharedData} = scenario.waitForDefund;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.DecideClosing");
  });

  describeScenarioStep(scenario.decideClosing, () => {
    const {action, state, sharedData} = scenario.decideClosing;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.Success");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("Player Concluded Happy Path", () => {
  const scenario = scenarios.playerConcludedHappyPath;

  describe("when initializing", () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result, "Concluding.WaitForConclude");
    itRelaysThisAction(
      result.sharedData,
      concludeInstigated({channelId: scenario.initialize.channelId})
    );
    itSendsThisDisplayEventType(result.sharedData, "Show");
  });

  describeScenarioStep(scenario.waitForConclude, () => {
    const {action, state, sharedData} = scenario.waitForConclude;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.WaitForDefund");
  });

  describeScenarioStep(scenario.waitForDefund, () => {
    const {action, state, sharedData} = scenario.waitForDefund;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.DecideClosing");
  });

  describeScenarioStep(scenario.decideClosing, () => {
    const {action, state, sharedData} = scenario.decideClosing;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.Success");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("Player Closes Channel Happy Path", () => {
  const scenario = scenarios.channelClosingHappyPath;

  describe("when initializing", () => {
    const result = initialize(scenario.initialize);
    itTransitionsTo(result, "Concluding.WaitForConclude");
    itRelaysThisAction(
      result.sharedData,
      concludeInstigated({channelId: scenario.initialize.channelId})
    );
    itSendsThisDisplayEventType(result.sharedData, "Show");
  });

  describeScenarioStep(scenario.waitForConclude, () => {
    const {action, state, sharedData} = scenario.waitForConclude;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.WaitForDefund");
  });

  describeScenarioStep(scenario.waitForDefund, () => {
    const {action, state, sharedData} = scenario.waitForDefund;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.DecideClosing");
  });

  describeScenarioStep(scenario.decideClosing, () => {
    const {action, state, sharedData} = scenario.decideClosing;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.WaitForLedgerClose");
  });

  describeScenarioStep(scenario.waitForLedgerClosing, () => {
    const {action, state, sharedData} = scenario.waitForLedgerClosing;
    const result = concludingReducer(state, sharedData, action);
    itTransitionsTo(result, "Concluding.Success");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

function itTransitionsTo(result, type: ConcludingStateType) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
