import {
  AllocationItem,
  Outcome,
  isAllocationOutcome,
  convertAddressToBytes32
} from "@statechannels/nitro-protocol";

import _ from "lodash";

import {initialize, ledgerTopUpReducer} from "../reducer";
import {LedgerTopUpState, LedgerTopUpStateType} from "../states";
import {ProtocolStateWithSharedData} from "../..";
import {describeScenarioStep} from "../../../__tests__/helpers";
import {bsAddress, asAddress} from "../../../__tests__/state-helpers";
import {isTerminal} from "../../consensus-update";

import * as scenarios from "./scenarios";

const asAddressPadded = convertAddressToBytes32(asAddress);
const bsAddressPadded = convertAddressToBytes32(bsAddress);

describe("player A happy path", () => {
  const scenario = scenarios.playerAHappyPath;

  describe("when initializing", () => {
    const initialState = initialize(scenario.initialize);
    it("requests the correct allocation/destination updates", () => {
      const consensusOutcome = getProposedConsensus(initialState.protocolState);
      const expectedAllocation = [
        {destination: bsAddressPadded, amount: "0x03"},
        {destination: asAddressPadded, amount: "0x04"}
      ];
      expectOutcomeToContain(consensusOutcome, expectedAllocation);
    });
    itTransitionsTo(initialState, "LedgerTopUp.SwitchOrderAndAddATopUpUpdate");
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const {action, sharedData, state} = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForA");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x02");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x07");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "LedgerTopUp.RestoreOrderAndAddBTopUpUpdate");
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const {action, sharedData, state} = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForB");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x0");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x09");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForB, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForB;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "LedgerTopUp.Success");
  });
});

describe("player B happy path", () => {
  const scenario = scenarios.playerBHappyPath;
  describe("when initializing", () => {
    const initialState = initialize(scenario.initialize);

    itTransitionsTo(initialState, "LedgerTopUp.SwitchOrderAndAddATopUpUpdate");
    it("requests the correct allocation/destination updates", () => {
      const consensusOutcome = getProposedConsensus(initialState.protocolState);
      const expectedAllocation = [
        {destination: bsAddressPadded, amount: "0x03"},
        {destination: asAddressPadded, amount: "0x04"}
      ];
      expectOutcomeToContain(consensusOutcome, expectedAllocation);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const {action, sharedData, state} = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForA");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x0");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x07");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.RestoreOrderAndAddBTopUpUpdate");
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const {action, sharedData, state} = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForB");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x02");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x09");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForB, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForB;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.Success");
  });
});

describe("player A one user needs top up", () => {
  const scenario = scenarios.playerAOneUserNeedsTopUp;
  describe("when initializing", () => {
    const initialState = initialize(scenario.initialize);

    itTransitionsTo(initialState, "LedgerTopUp.SwitchOrderAndAddATopUpUpdate");
    it("requests the correct outcome", () => {
      const consensusOutcome = getProposedConsensus(initialState.protocolState);
      const expectedAllocation = [
        {destination: bsAddressPadded, amount: "0x03"},
        {destination: asAddressPadded, amount: "0x04"}
      ];
      expectOutcomeToContain(consensusOutcome, expectedAllocation);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const {action, sharedData, state} = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForA");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x02");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x07");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.RestoreOrderAndAddBTopUpUpdate");
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const {action, sharedData, state} = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.Success");
  });
});

describe("player B one user needs top up", () => {
  const scenario = scenarios.playerBOneUserNeedsTopUp;
  describe("when initializing", () => {
    const initialState = initialize(scenario.initialize);

    itTransitionsTo(initialState, "LedgerTopUp.SwitchOrderAndAddATopUpUpdate");
    it("requests the correct allocation/destination updates", () => {
      const consensusOutcome = getProposedConsensus(initialState.protocolState);
      const expectedAllocation = [
        {destination: bsAddressPadded, amount: "0x03"},
        {destination: asAddressPadded, amount: "0x04"}
      ];
      expectOutcomeToContain(consensusOutcome, expectedAllocation);
    });
  });

  describeScenarioStep(scenario.switchOrderAndAddATopUpUpdate, () => {
    const {action, sharedData, state} = scenario.switchOrderAndAddATopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.WaitForDirectFundingForA");
    it("requests the correct deposit amount", () => {
      expect(getRequiredDeposit(updatedState.protocolState)).toEqual("0x0");
      expect(getTotalFundingRequired(updatedState.protocolState)).toEqual("0x07");
    });
  });

  describeScenarioStep(scenario.waitForDirectFundingForA, () => {
    const {action, sharedData, state} = scenario.waitForDirectFundingForA;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.RestoreOrderAndAddBTopUpUpdate");
  });

  describeScenarioStep(scenario.restoreOrderAndAddBTopUpUpdate, () => {
    const {action, sharedData, state} = scenario.restoreOrderAndAddBTopUpUpdate;
    const updatedState = ledgerTopUpReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "LedgerTopUp.Success");
  });
});

type ReturnVal = ProtocolStateWithSharedData<LedgerTopUpState>;

function itTransitionsTo(state: ReturnVal, type: LedgerTopUpStateType) {
  it(`transitions protocol state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}

function getRequiredDeposit(protocolState: LedgerTopUpState): string {
  if ("directFundingState" in protocolState) {
    return protocolState.directFundingState.requiredDeposit;
  }
  return "0x0";
}

function getTotalFundingRequired(protocolState: LedgerTopUpState): string {
  if ("directFundingState" in protocolState) {
    return protocolState.directFundingState.totalFundingRequired;
  }
  return "0x0";
}

function getProposedConsensus(protocolState: LedgerTopUpState): Outcome {
  if ("consensusUpdateState" in protocolState && !isTerminal(protocolState.consensusUpdateState)) {
    return protocolState.consensusUpdateState.proposedOutcome;
  }
  return [];
}
function expectOutcomeToContain(outcome: Outcome, items: AllocationItem[]) {
  if (outcome.length !== 1) {
    throw new Error("Wallet currently only supports one outcome.");
  }
  const assetOutcome = outcome[0];
  if (!isAllocationOutcome(assetOutcome)) {
    throw new Error("Not an allocation outcome.");
  }
  expect(assetOutcome.allocationItems).toEqual(expect.arrayContaining(items));
}
