import * as scenarios from "./scenarios";
import {initialize, responderReducer} from "../reducer";

import * as states from "../states";
import * as TransactionGenerator from "../../../../../utils/transaction-generator";
import {itSendsThisDisplayEventType, itSendsThisMessage} from "../../../../__tests__/helpers";
import {describeScenarioStep} from "../../../../__tests__/helpers";
import {State} from "@statechannels/nitro-protocol";
import {
  apiNotImplemented,
  channelUpdatedEvent
} from "../../../../sagas/messaging/outgoing-api-actions";

// Mocks
const mockTransaction = {to: "0xabc"};
const createRespondWithMoveMock = jest.fn().mockReturnValue(mockTransaction);
const refuteMock = jest.fn().mockReturnValue(mockTransaction);
Object.defineProperty(TransactionGenerator, "createRespondTransaction", {
  value: createRespondWithMoveMock
});
Object.defineProperty(TransactionGenerator, "createRefuteTransaction", {
  value: refuteMock
});

// helpers

const itTransitionsToFailure = (
  result: {protocolState: states.ResponderState},
  failure: states.Failure
) => {
  it(`transitions to failure with reason ${failure.reason}`, () => {
    expect(result.protocolState).toMatchObject(failure);
  });
};

// TODO: Also check that is submits the previous state too
const itCallsRespondWithMoveWith = (responseState: State) => {
  it("calls respond with move with the correct state", () => {
    expect(createRespondWithMoveMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({state: responseState})
    );
  });
};

const itTransitionsTo = (
  result: {protocolState: states.ResponderState},
  type: states.ResponderStateType
) => {
  it(`transitions to ${type}`, () => {
    expect(result.protocolState.type).toEqual(type);
  });
};

const itSetsChallengeState = (result: {protocolState: states.ResponderState}, state: State) => {
  it("sets the correct challenge state", () => {
    expect((result.protocolState as states.WaitForApproval).challengeState).toMatchObject(state);
  });
};

describe("RESPOND WITH EXISTING MOVE HAPPY-PATH", () => {
  const scenario = scenarios.respondWithExistingStateHappyPath;
  const {sharedData, processId, channelId} = scenario;

  describe("when initializing", () => {
    const {challengeState, expiryTime} = scenario;
    const result = initialize(processId, channelId, expiryTime, sharedData, challengeState);

    itTransitionsTo(result, "Responding.WaitForApproval");
    itSendsThisDisplayEventType(result.sharedData, "Show");
    itSetsChallengeState(result, challengeState);
  });

  describeScenarioStep(scenario.waitForApproval, () => {
    const {state, action, responseState} = scenario.waitForApproval;
    const result = responderReducer(state, sharedData, action);

    itTransitionsTo(result, "Responding.WaitForTransaction");
    itCallsRespondWithMoveWith(responseState);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.WaitForAcknowledgement");
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const {state, action} = scenario.waitForAcknowledgement;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.Success");
  });
});

describe("REFUTE HAPPY-PATH ", () => {
  const scenario = scenarios.refuteHappyPath;
  const {sharedData, processId, channelId} = scenario;

  describe("when initializing", () => {
    const {challengeState, expiryTime} = scenario;
    const result = initialize(processId, channelId, expiryTime, sharedData, challengeState);

    itTransitionsTo(result, "Responding.WaitForApproval");
    itSetsChallengeState(result, scenario.challengeState);
  });

  describeScenarioStep(scenario.waitForApproval, () => {
    const {state, action} = scenario.waitForApproval;
    const result = responderReducer(state, sharedData, action);

    itTransitionsTo(result, "Responding.WaitForTransaction");
    // TODO: Once we are using SignedStates we can check refute has been called with them
    expect(refuteMock).toHaveBeenCalled();
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.WaitForAcknowledgement");
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const {state, action} = scenario.waitForAcknowledgement;

    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.Success");
  });
});

describe("REQUIRE RESPONSE HAPPY-PATH ", () => {
  const scenario = scenarios.requireResponseHappyPath;
  const {sharedData, processId, channelId, expiryTime} = scenario;

  describe("when initializing", () => {
    const result = initialize(
      processId,
      channelId,
      expiryTime,
      sharedData,
      scenario.challengeState
    );
    itTransitionsTo(result, "Responding.WaitForApproval");
    itSetsChallengeState(result, scenario.challengeState);
  });

  describeScenarioStep(scenario.waitForApprovalRequiresResponse, () => {
    const {state, action} = scenario.waitForApprovalRequiresResponse;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.WaitForResponse");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });

  describeScenarioStep(scenario.waitForResponse, () => {
    const {state, action, responseState} = scenario.waitForResponse;
    const result = responderReducer(state, sharedData, action);
    itSendsThisDisplayEventType(result.sharedData, "Show");
    itTransitionsTo(result, "Responding.WaitForTransaction");
    itCallsRespondWithMoveWith(responseState);
  });

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.WaitForAcknowledgement");
  });

  describeScenarioStep(scenario.waitForAcknowledgement, () => {
    const {state, action} = scenario.waitForAcknowledgement;
    const result = responderReducer(state, sharedData, action);
    itSendsThisDisplayEventType(result.sharedData, "Hide");
    itSendsThisMessage(result.sharedData, channelUpdatedEvent({channelId}));
    itTransitionsTo(result, "Responding.Success");
  });
});

describe("TRANSACTION FAILED ", () => {
  const scenario = scenarios.transactionFails;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsToFailure(result, scenario.failure);
  });
});

describe("CHALLENGE EXPIRES AND CHANNEL not DEFUNDED", () => {
  const scenario = scenarios.challengeExpires;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForResponse, () => {
    const {state, action} = scenario.waitForResponse;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.AcknowledgeTimeout");
    itSendsThisDisplayEventType(result.sharedData, "Show");
    itSendsThisMessage(result.sharedData, apiNotImplemented({apiMethod: "OpponentConcluded"}));
  });

  describeScenarioStep(scenario.acknowledgeTimeout, () => {
    const {state, action} = scenario.acknowledgeTimeout;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.Failure");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("CHALLENGE EXPIRES AND CHANNEL DEFUNDED", () => {
  const scenario = scenarios.challengeExpiresAndDefund;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.defund, () => {
    const {state, action} = scenario.defund;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.Failure");
  });
});

describe("CHALLENGE EXPIRES when in WaitForTransaction", () => {
  const scenario = scenarios.challengeExpiresDuringWaitForTransaction;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.AcknowledgeTimeout");
    itSendsThisMessage(result.sharedData, apiNotImplemented({apiMethod: "OpponentConcluded"}));
  });
});

describe("CHALLENGE EXPIRES when in WaitForApproval", () => {
  const scenario = scenarios.challengeExpiresDuringWaitForApproval;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForApprovalRespond, () => {
    const {state, action} = scenario.waitForApprovalRespond;
    const result = responderReducer(state, sharedData, action);
    itTransitionsTo(result, "Responding.AcknowledgeTimeout");
    itSendsThisMessage(result.sharedData, apiNotImplemented({apiMethod: "OpponentConcluded"}));
  });
});
