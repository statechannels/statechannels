import * as scenarios from "./scenarios";
import {challengerReducer, initialize, ReturnVal} from "../reducer";
import {
  FailureReason,
  ChallengerStateType,
  WaitForTransaction,
  WaitForResponseOrTimeout
} from "../states";
import {
  itSendsThisMessage,
  itSendsThisDisplayEventType,
  describeScenarioStep,
  itStoresThisState
} from "../../../../__tests__/helpers";
import {
  apiNotImplemented,
  channelUpdatedEvent
} from "../../../../sagas/messaging/outgoing-api-actions";

describe("OPPONENT RESPONDS", () => {
  const scenario = scenarios.opponentResponds;
  const {channelId, processId, sharedData} = scenario;

  describe("when initializing", () => {
    const result = initialize(channelId, processId, sharedData);
    itSendsThisDisplayEventType(result.sharedData, "Show");

    itTransitionsTo(result, "Challenging.ApproveChallenge");
  });
  describeScenarioStep(scenario.approveChallenge, () => {
    const {state, action} = scenario.approveChallenge;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.WaitForTransaction");
    // it initializes the transaction state machine
  });
  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action2} = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action2);

    itTransitionsTo(result, "Challenging.WaitForTransaction");
    it("updates the expiry time", () => {
      expect((result.state as WaitForTransaction).expiryTime).toEqual(action2.expiryTime);
    });
  });
  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.WaitForResponseOrTimeout");
  });

  describeScenarioStep(scenario.waitForResponseOrTimeoutExpirySet, () => {
    const {state, action: action1} = scenario.waitForResponseOrTimeoutExpirySet;
    const result = challengerReducer(state, sharedData, action1);

    itTransitionsTo(result, "Challenging.WaitForResponseOrTimeout");
    it("updates the expiry time", () => {
      expect((result.state as WaitForResponseOrTimeout).expiryTime).toEqual(action1.expiryTime);
    });
  });

  describeScenarioStep(scenario.waitForResponseOrTimeoutReceiveResponse, () => {
    const {state, action, signedState} = scenario.waitForResponseOrTimeoutReceiveResponse;
    const result = challengerReducer(state, sharedData, action);

    itSendsThisMessage(result.sharedData, apiNotImplemented({apiMethod: "ChallengeStateReceived"}));

    itStoresThisState(result.sharedData, signedState);
    itTransitionsTo(result, "Challenging.AcknowledgeResponse");
  });

  describeScenarioStep(scenario.acknowledgeResponse, () => {
    const {state, action} = scenario.acknowledgeResponse;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.SuccessOpen");
    itSendsThisMessage(result.sharedData, channelUpdatedEvent({channelId}));
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("CHALLENGE TIMES OUT AND IS DEFUNDED", () => {
  const scenario = scenarios.challengeTimesOutAndIsDefunded;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForResponseOrTimeout, () => {
    const {state, action} = scenario.waitForResponseOrTimeout;
    const result = challengerReducer(state, sharedData, action);
    itTransitionsTo(result, "Challenging.AcknowledgeTimeout");
  });

  describeScenarioStep(scenario.defund, () => {
    const {state, action} = scenario.defund;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.SuccessClosed");
  });
});

describe("CHALLENGE TIMES OUT AND IS not DEFUNDED", () => {
  const scenario = scenarios.challengeTimesOutAndIsNotDefunded;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.acknowledgeTimeout, () => {
    const {state, action} = scenario.acknowledgeTimeout;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.SuccessClosed");
    itSendsThisDisplayEventType(result.sharedData, "Hide");
  });
});

describe("CHANNEL DOESNT EXIST  ", () => {
  const scenario = scenarios.channelDoesntExist;
  const {channelId, processId, sharedData} = scenario;

  describe("when initializing", () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "ChannelDoesNotExist");
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "ChannelDoesNotExist");
  });
});

describe("CHANNEL NOT FULLY OPEN  ", () => {
  const scenario = scenarios.channelNotFullyOpen;
  const {channelId, processId, sharedData} = scenario;

  describe("when initializing", () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "NotFullyOpen");
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "NotFullyOpen");
  });
});

describe("ALREADY HAVE LATEST STATE", () => {
  const scenario = scenarios.alreadyHaveLatest;
  const {channelId, processId, sharedData} = scenario;

  describe("when initializing", () => {
    const result = initialize(channelId, processId, sharedData);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "AlreadyHaveLatest");
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "AlreadyHaveLatest");
  });
});

describe("USER DECLINES CHALLENGE  ", () => {
  const scenario = scenarios.userDeclinesChallenge;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.approveChallenge, () => {
    const {state, action} = scenario.approveChallenge;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "DeclinedByUser");
  });
  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "DeclinedByUser");
  });
});

describe("RECEIVE STATE WHILE APPROVING  ", () => {
  const scenario = scenarios.receiveStateWhileApproving;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.approveChallenge, () => {
    const {state, action} = scenario.approveChallenge;
    // note: we're triggering this off the user's acceptance, not the arrival of the update
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "LatestWhileApproving");
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;

    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "LatestWhileApproving");
  });
});

describe("TRANSACTION FAILS  ", () => {
  const scenario = scenarios.transactionFails;
  const {sharedData} = scenario;

  describeScenarioStep(scenario.waitForTransaction, () => {
    const {state, action} = scenario.waitForTransaction;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.AcknowledgeFailure");
    itHasFailureReason(result, "TransactionFailed");
  });

  describeScenarioStep(scenario.acknowledgeFailure, () => {
    const {state, action} = scenario.acknowledgeFailure;
    const result = challengerReducer(state, sharedData, action);

    itTransitionsTo(result, "Challenging.Failure");
    itHasFailureReason(result, "TransactionFailed");
  });
});

function itTransitionsTo(result: ReturnVal, type: ChallengerStateType) {
  if (!result.state) {
    console.log(result);
  }
  it(`transitions to ${type}`, () => {
    expect(result.state.type).toEqual(type);
  });
}

function itHasFailureReason(result: ReturnVal, reason: FailureReason) {
  it(`has failure reason ${reason}`, () => {
    if ("reason" in result.state) {
      expect(result.state.reason).toEqual(reason);
    } else {
      throw new Error(`State ${result.state.type} doesn't have a failure reason.`);
    }
  });
}
