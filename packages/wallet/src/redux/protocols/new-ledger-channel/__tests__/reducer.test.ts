import {NewLedgerChannelReducer, initialize} from "../reducer";
import {ProtocolStateWithSharedData} from "../..";
import {NewLedgerChannelState, WaitForDirectFunding} from "../states";

import {describeScenarioStep, itSendsAMessage} from "../../../__tests__/helpers";
import * as selectors from "../../../selectors";

import * as scenarios from "./scenarios";

// Mocks
const getNextNonceMock = jest.fn().mockReturnValue(0);
Object.defineProperty(selectors, "getNextNonce", {
  value: getNextNonceMock
});

describe("happy-path scenario", () => {
  const scenario = scenarios.happyPath;
  describe("when initializing", () => {
    const initialState = initialize(scenario.initialParams);

    itTransitionsTo(initialState, "NewLedgerChannel.WaitForPreFundSetup");
    itSendsAMessage(initialState);
  });

  describeScenarioStep(scenario.waitForPreFundL1, () => {
    const {state, action, sharedData} = scenario.waitForPreFundL1;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "NewLedgerChannel.WaitForDirectFunding");
    // TODO: We should be testing this for player B as well
    expect(
      (updatedState.protocolState as WaitForDirectFunding).directFundingState.safeToDepositLevel
    ).toEqual("0x0");
  });

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const {state, action, sharedData} = scenario.waitForDirectFunding;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "NewLedgerChannel.WaitForPostFundSetup");
  });

  describeScenarioStep(scenario.waitForPostFund1, () => {
    const {state, action, sharedData} = scenario.waitForPostFund1;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "NewLedgerChannel.Success");
  });
});

describe("ledger-funding-fails scenario", () => {
  const scenario = scenarios.ledgerFundingFails;

  describeScenarioStep(scenario.waitForDirectFunding, () => {
    const {state, action, sharedData} = scenario.waitForDirectFunding;
    const updatedState = NewLedgerChannelReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "NewLedgerChannel.Failure");
  });
});

// -------
// Helpers
// -------
type ReturnVal = ProtocolStateWithSharedData<NewLedgerChannelState>;

function itTransitionsTo(state: ReturnVal, type: NewLedgerChannelState["type"]) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
