import * as acStates from "../states";
import {initialize, reducer} from "../reducer";

import {
  itSendsTheseStates,
  itStoresThisState,
  itRegistersThisChannel,
  itSendsNoMessage
} from "../../../__tests__/helpers";

import * as scenarios from "./scenarios";

const itTransitionsTo = (
  result: acStates.AdvanceChannelState,
  type: acStates.AdvanceChannelStateType
) => {
  it(`transitions to ${type}`, () => {
    expect(result.type).toEqual(type);
  });
};

describe("sending preFundSetup as A", () => {
  const scenario = scenarios.newChannelAsA;
  const {processId, channelId} = scenario;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsTheseStates(result, states);
    itStoresThisState(result, states[0]);
    itRegistersThisChannel(result, channelId, processId, args.protocolLocator);
  });

  describe("when receiving prefund states from b", () => {
    const {states, state, sharedData, action} = scenario.receiveFromB;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsNoMessage(result);
    itStoresThisState(result, states[1]);
  });

  describe("when receiving prefund states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending conclude as A", () => {
  const scenario = scenarios.concludingAsA;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsTheseStates(result, states);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving conclude states from b", () => {
    const {states, state, sharedData, action} = scenario.receiveFromB;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving conclude states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending conclude as B", () => {
  const scenario = scenarios.concludingAsB;

  describe("when initializing", () => {
    const {sharedData, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
  });

  describe("when receiving conclude states from a", () => {
    const {states, state, sharedData, action} = scenario.receiveFromA;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");

    itSendsTheseStates(result, states);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving conclude states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending conclude as hub", () => {
  const scenario = scenarios.concludingAsHub;

  describe("when initializing", () => {
    const {sharedData, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
  });

  describe("when receiving conclude states from a", () => {
    const {states, state, sharedData, action} = scenario.receiveFromA;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving conclude states from b", () => {
    const {state, sharedData, action, states} = scenario.receiveFromB;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsTheseStates(result, states);
  });
});

describe("sending preFundSetup as B", () => {
  const scenario = scenarios.newChannelAsB;
  const {processId, channelId} = scenario;

  describe("when initializing", () => {
    const {sharedData, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.ChannelUnknown");
    itSendsNoMessage(result);
  });

  describe("when receiving prefund states from A", () => {
    const {state, sharedData, action, states} = scenario.receiveFromA;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itStoresThisState(result, states[1]);
    itSendsTheseStates(result, states);
    itRegistersThisChannel(result, channelId, processId, scenario.protocolLocator);
  });

  describe("when receiving prefund states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending preFundSetup as Hub", () => {
  const scenario = scenarios.newChannelAsHub;
  const {processId, channelId} = scenario;

  describe("when initializing", () => {
    const {sharedData, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.ChannelUnknown");
    itSendsNoMessage(result);
  });

  describe("when receiving prefund states from A", () => {
    const {state, sharedData, action, states} = scenario.receiveFromA;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.ChannelUnknown");
    itStoresThisState(result, states[0]);
    itSendsNoMessage(result);
  });

  describe("when receiving prefund states from B", () => {
    const {state, sharedData, action, states} = scenario.receiveFromB;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsTheseStates(result, states);
    itRegistersThisChannel(result, channelId, processId, scenario.protocolLocator);
  });
});

describe("sending postFundSetup as A", () => {
  const scenario = scenarios.existingChannelAsA;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsTheseStates(result, states);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving postFund states from b", () => {
    const {states, state, sharedData, action} = scenario.receiveFromB;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving postfund states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending postFundSetup as B", () => {
  const scenario = scenarios.existingChannelAsB;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving a PostFund state from A", () => {
    const {states, state, sharedData, action} = scenario.receiveFromA;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsTheseStates(result, states);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving postfund states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromHub;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsNoMessage(result);
  });
});

describe("sending postFundSetup as Hub", () => {
  const scenario = scenarios.existingChannelAsHub;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
  });

  describe("when receiving postfund states from the hub", () => {
    const {state, sharedData, action, states} = scenario.receiveFromB;

    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.Success");
    itStoresThisState(result, states[2]);
    itSendsTheseStates(result, states);
  });
});

describe("when not cleared to send", () => {
  const scenario = scenarios.notClearedToSend;

  describe("when initializing", () => {
    const {sharedData, states, args} = scenario.initialize;
    const {protocolState, sharedData: result} = initialize(sharedData, args);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itSendsNoMessage(result);
    itStoresThisState(result, states[2]);
    itIsNotClearedToSend(protocolState);
  });

  describe("when cleared to send, and it is safe to send", () => {
    const {state, sharedData, action, states} = scenario.clearedToSend;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itStoresThisState(result, states[2]);
    itSendsTheseStates(result, states);
  });

  describe("when cleared to send, and it is unsafe to send", () => {
    const {state, sharedData, action, states} = scenario.clearedToSendButUnsafe;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.NotSafeToSend");
    itStoresThisState(result, states[1]);
    itSendsNoMessage(result);
    itIsClearedToSend(protocolState);
  });

  describe("when cleared to send, and the channel is unknown", () => {
    const {state, sharedData, action} = scenario.clearedToSendButChannelUnknown;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.ChannelUnknown");
    itSendsNoMessage(result);
    itIsClearedToSend(protocolState);
  });

  describe("when cleared to send, but the state was already sent", () => {
    const {state, sharedData, action} = scenario.clearedToSendAndAlreadySent;
    const {protocolState, sharedData: result} = reducer(state, sharedData, action);

    itTransitionsTo(protocolState, "AdvanceChannel.StateSent");
    itSendsNoMessage(result);
  });
});

function itIsClearedToSend(protocolState: acStates.AdvanceChannelState) {
  it("is cleared to send", () => {
    expect(protocolState).toMatchObject({clearedToSend: true});
  });
}

function itIsNotClearedToSend(protocolState: acStates.AdvanceChannelState) {
  it("is cleared to send", () => {
    expect(protocolState).toMatchObject({clearedToSend: false});
  });
}
