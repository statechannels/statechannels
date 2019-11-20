import * as states from "../states";
import * as testScenarios from "../../../__tests__/state-helpers";

import * as actions from "../actions";

// -----------------
// Channel Scenarios
// -----------------
const {
  channelId,
  asAddress: address,
  asPrivateKey: privateKey,
  participants,
  bytecode
} = testScenarios;
import {ChannelState} from "../../../channel-store";
import {setChannel, EMPTY_SHARED_DATA} from "../../../state";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import {APPLICATION_PROCESS_ID} from "../reducer";
import {
  challengerPreSuccessOpenState,
  terminatingAction,
  challengerPreSuccessClosedState
} from "../../dispute/challenger";

const signedState19 = testScenarios.appState({turnNum: 19});
const signedState20 = testScenarios.appState({turnNum: 20});
const signedState21 = testScenarios.appState({turnNum: 21});
const signedState22 = testScenarios.appState({turnNum: 22});
const preFundState0 = testScenarios.appState({turnNum: 0}).state;

const theirTurn = channelFromStates([signedState19, signedState20], address, privateKey);
const ourTurn = channelFromStates([signedState20, signedState21], address, privateKey);

// --------
// Defaults
// --------
const processId = "processId";
const storage = (channelState: ChannelState) => setChannel(EMPTY_SHARED_DATA, channelState);

const defaults = {processId, channelId, address, privateKey, participants, bytecode};

// ------
// States
// ------
const addressKnown = states.waitForFirstState({channelId, address, privateKey, participants});
const ongoing = states.ongoing({channelId, address, privateKey});
const waitForDispute1 = states.waitForDispute({
  channelId,
  address,
  privateKey,
  disputeState: challengerPreSuccessOpenState
});
const waitForDispute2 = states.waitForDispute({
  channelId,
  address,
  privateKey,
  disputeState: challengerPreSuccessClosedState
});

// -------
// Actions
// -------

const receivePreFundSetup = actions.ownStateReceived({
  processId,
  state: preFundState0
});
const receiveOurState = actions.ownStateReceived({
  processId,
  state: signedState22.state
});

const receiveTheirState = actions.opponentStateReceived({
  processId,
  signedState: signedState21
});

const receiveTheirInvalidState = actions.opponentStateReceived({
  processId,
  signedState: signedState19
});
const receiveOurInvalidState = actions.ownStateReceived({
  processId,
  state: signedState20.state
});

const concluded = actions.concluded({processId: APPLICATION_PROCESS_ID});

const challengeRequested = actions.challengeRequested({
  processId,
  channelId,
  state: signedState21.state
});

const challengeDetected = actions.challengeDetected({
  processId,
  channelId,
  state: signedState21.state,
  expiresAt: 999
});

const disputeTerminated = {...terminatingAction};

// -------
// SharedData
// -------
const emptySharedData = EMPTY_SHARED_DATA;
const ourTurnSharedData = storage(ourTurn);
const theirTurnSharedData = storage(theirTurn);

// -------
// Scenarios
// -------
export const initializingApplication = {
  ...defaults,
  initialize: {sharedData: emptySharedData}
};

export const startingApplication = {
  ...defaults,
  addressKnown: {
    state: addressKnown,
    sharedData: emptySharedData,
    action: receivePreFundSetup
  }
};

export const receivingACloseRequest = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: ourTurnSharedData,
    action: concluded
  }
};

export const receivingOurState = {
  ...defaults,
  ongoing: {
    sharedData: ourTurnSharedData,
    state: ongoing,
    action: receiveOurState
  }
};

export const receivingTheirState = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: theirTurnSharedData,
    action: receiveTheirState
  }
};

export const receivingTheirInvalidState = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: theirTurnSharedData,
    action: receiveTheirInvalidState
  }
};

export const receivingOurInvalidState = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: ourTurnSharedData,
    action: receiveOurInvalidState
  }
};

export const challengeWasRequested = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: ourTurnSharedData,
    action: challengeRequested
  }
};
export const challengeWasDetected = {
  ...defaults,
  ongoing: {
    state: ongoing,
    sharedData: ourTurnSharedData,
    action: challengeDetected
  }
};
export const challengeRespondedTo = {
  ...defaults,
  waitForDispute: {
    state: waitForDispute1,
    sharedData: ourTurnSharedData,
    action: disputeTerminated
  }
};
export const challengeExpired = {
  ...defaults,
  waitForDispute: {
    state: waitForDispute2,
    sharedData: ourTurnSharedData,
    action: disputeTerminated
  }
};
