import * as states from "../states";
import {fundingStrategyNegotiationReducer as reducer} from "../reducer";
import {ProtocolStateWithSharedData} from "../../..";
import {describeScenarioStep, itRelaysThisAction} from "../../../../__tests__/helpers";
import {FundingStrategyNegotiationStateType} from "../../states";
import * as commActions from "../../../../../communication/actions";

import * as scenarios from "./scenarios";

describe("indirect strategy chosen", () => {
  const scenario = scenarios.indirectStrategyChosen;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const {state, sharedData, action} = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse");
    const {processId} = scenario;
    itRelaysThisAction(
      result,
      commActions.strategyProposed({processId, strategy: "IndirectFundingStrategy"})
    );
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const {state, sharedData, action} = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Success");
  });
});

describe("virtual strategy chosen", () => {
  const scenario = scenarios.virtualStrategyChosen;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const {state, sharedData, action} = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.WaitForStrategyResponse");
    const {processId} = scenario;
    itRelaysThisAction(
      result,
      commActions.strategyProposed({processId, strategy: "VirtualFundingStrategy"})
    );
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const {state, sharedData, action} = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Success");
  });
});

describe("When a strategy is rejected", () => {
  const scenario = scenarios.rejectedStrategy;

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const {state, sharedData, action} = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.WaitForStrategyChoice");
  });
});

describe("when cancelled by the opponent", () => {
  const scenario = scenarios.cancelledByOpponent;

  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const {state, sharedData, action} = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Failure");
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const {state, sharedData, action} = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Failure");
  });
});

describe("when cancelled by the user", () => {
  const scenario = scenarios.cancelledByUser;
  describeScenarioStep(scenario.waitForStrategyChoice, () => {
    const {state, sharedData, action} = scenario.waitForStrategyChoice;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Failure");
  });

  describeScenarioStep(scenario.waitForStrategyResponse, () => {
    const {state, sharedData, action} = scenario.waitForStrategyResponse;
    const result = reducer(state, sharedData, action);

    itTransitionsTo(result, "FundingStrategyNegotiation.PlayerA.Failure");
  });
});

function itTransitionsTo(
  result: ProtocolStateWithSharedData<states.FundingStrategyNegotiationState>,
  type: FundingStrategyNegotiationStateType
) {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
}
