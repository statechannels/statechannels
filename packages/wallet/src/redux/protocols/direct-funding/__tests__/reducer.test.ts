import {Interface} from "ethers/utils";

import {directFundingStateReducer, initialize} from "../reducer";
import * as states from "../states";

import {ProtocolStateWithSharedData} from "../..";
import {itSendsATransaction, itSendsThisTransaction} from "../../../__tests__/helpers";
import {describeScenarioStep} from "../../../__tests__/helpers";

import * as scenarios from "./scenarios";

describe("Player A Happy path", () => {
  const scenario = scenarios.aHappyPath;
  describe("when initializing", () => {
    const updatedState = initialize(scenario.initialize);
    itTransitionsTo(updatedState, "DirectFunding.WaitForDepositTransaction");
    itSendsATransaction(updatedState);
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const {action, state, sharedData} = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.WaitForFunding");
  });

  describeScenarioStep(scenario.waitForFunding, () => {
    const {action, state, sharedData} = scenario.waitForFunding;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.FundingSuccess");
  });
});

describe("Player A Funding Event Received Early", () => {
  const scenario = scenarios.fundsReceivedArrivesEarly;

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const {action, state, sharedData} = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.WaitForDepositTransaction");
  });

  describeScenarioStep(scenario.waitForDepositTransactionFunded, () => {
    const {action, state, sharedData} = scenario.waitForDepositTransactionFunded;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.FundingSuccess");
  });
});
describe("Player B Happy path", () => {
  const scenario = scenarios.bHappyPath;
  describe("when initializing", () => {
    const updatedState = initialize(scenario.initialize);
    itTransitionsTo(updatedState, "DirectFunding.NotSafeToDeposit");
  });
  describeScenarioStep(scenario.notSafeToDeposit, () => {
    const {action, state, sharedData} = scenario.notSafeToDeposit;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.WaitForDepositTransaction");

    const {assetHolderAddress, destination, destinationHoldings, processId} = action;
    itSendsThisTransaction(updatedState, {
      processId,
      transactionRequest: {
        to: assetHolderAddress,
        value: updatedState.protocolState.requiredDeposit,
        data: new Interface([
          // NOTE: Copied from ETHAssetHolder.sol
          "deposit(bytes32 destination, uint256 expectedHeld, uint256 amount)"
        ]).functions.deposit.encode([
          destination,
          destinationHoldings,
          updatedState.protocolState.requiredDeposit
        ])
      }
    });
  });

  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const {action, state, sharedData} = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.WaitForFunding");
  });

  describeScenarioStep(scenario.waitForFunding, () => {
    const {action, state, sharedData} = scenario.waitForFunding;
    const updatedState = directFundingStateReducer(state, sharedData, action);
    itTransitionsTo(updatedState, "DirectFunding.FundingSuccess");
  });
});

describe("Player A No Deposit Required", () => {
  const scenario = scenarios.depositNotRequired;
  describe("when initializing", () => {
    const updatedState = initialize(scenario.initialize);
    itTransitionsTo(updatedState, "DirectFunding.WaitForFunding");
  });
});

describe("Player A channel already has some funds", () => {
  const scenario = scenarios.existingOnChainDeposit;
  describe("when initializing", () => {
    const updatedState = initialize(scenario.initialize);
    itTransitionsTo(updatedState, "DirectFunding.WaitForDepositTransaction");
  });
});

describe("transaction-fails scenario", () => {
  const scenario = scenarios.transactionFails;
  describeScenarioStep(scenario.waitForDepositTransaction, () => {
    const {state, action, sharedData} = scenario.waitForDepositTransaction;
    const updatedState = directFundingStateReducer(state, sharedData, action);

    itTransitionsTo(updatedState, "DirectFunding.FundingFailure");
  });
});

function itTransitionsTo(
  state: ProtocolStateWithSharedData<states.DirectFundingState>,
  type: states.DirectFundingStateType
) {
  it(`transitions state to ${type}`, () => {
    expect(state.protocolState.type).toEqual(type);
  });
}
