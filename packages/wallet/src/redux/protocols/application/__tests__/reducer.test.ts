import * as states from "../states";
import {ProtocolStateWithSharedData} from "../..";
import {describeScenarioStep} from "../../../__tests__/helpers";
import {initialize, applicationReducer} from "../reducer";

import * as scenarios from "./scenarios";

function whenIn(state) {
  return `when in ${state}`;
}

describe("when initializing", () => {
  const scenario = scenarios.initializingApplication;
  const result = initialize(
    scenario.initialize.sharedData,
    scenario.channelId,
    scenario.address,
    scenario.privateKey,
    scenario.participants
  );
  itTransitionsTo(result, "Application.WaitForFirstState");
});

describe("starting the application", () => {
  const scenario = scenarios.startingApplication;

  describeScenarioStep(scenario.addressKnown, () => {
    const {state, sharedData, action} = scenario.addressKnown;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("signing a state", () => {
  const scenario = scenarios.receivingOurState;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;
    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("signing an invalid state", () => {
  const scenario = scenarios.receivingOurInvalidState;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("validating a state", () => {
  const scenario = scenarios.receivingTheirState;

  describe(whenIn("Application.Ongoing"), () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("validating an invalid state", () => {
  const scenario = scenarios.receivingTheirInvalidState;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("receiving a close request", () => {
  const scenario = scenarios.receivingACloseRequest;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Success");
  });
});

describe("a challenge was requested", () => {
  const scenario = scenarios.challengeWasRequested;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.WaitForDispute");
  });
});

describe("a challenge was detected", () => {
  const scenario = scenarios.challengeWasDetected;

  describeScenarioStep(scenario.ongoing, () => {
    const {state, sharedData, action} = scenario.ongoing;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.WaitForDispute");
  });
});

describe("a challenge was responded to", () => {
  const scenario = scenarios.challengeRespondedTo;

  describeScenarioStep(scenario.waitForDispute, () => {
    const {state, sharedData, action} = scenario.waitForDispute;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Ongoing");
  });
});

describe("a challenge expired", () => {
  const scenario = scenarios.challengeExpired;

  describeScenarioStep(scenario.waitForDispute, () => {
    const {state, sharedData, action} = scenario.waitForDispute;

    const result = applicationReducer(state, sharedData, action);

    itTransitionsTo(result, "Application.Success");
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.ApplicationState>,
  type: states.ApplicationStateType
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
