import {bigNumberify} from "ethers/utils";

import * as states from "../states";
import {ThreePartyPlayerIndex as PlayerIndex} from "../../../types";

import {setChannels, SharedData} from "../../../state";
import {channelFromStates} from "../../../channel-store/channel-state/__tests__";
import * as scenarios from "../../../__tests__/state-helpers";
import {EmbeddedProtocol, signedStatesReceived} from "../../../../communication";
import {StateType} from "../states";
import {clearedToSend} from "../actions";
import {CONSENSUS_LIBRARY_ADDRESS, CONSENSUS_LIBRARY_BYTECODE} from "../../../../constants";
import {makeLocator} from "../..";
import {createSharedDataFromParticipants} from "../../../__tests__/helpers";

// ---------
// Test data
// ---------

const processId = "Process.123";

const appDefinition = CONSENSUS_LIBRARY_ADDRESS;
const channelId = scenarios.threeWayLedgerId;
const {asAddress, asPrivateKey, bsAddress, bsPrivateKey, hubAddress, hubPrivateKey} = scenarios;
const twoThreeTwo = [
  {address: asAddress, wei: bigNumberify(2).toHexString()},
  {address: bsAddress, wei: bigNumberify(3).toHexString()},
  {address: hubAddress, wei: bigNumberify(2).toHexString()}
];
const signedState0 = scenarios.threeWayLedgerState({turnNum: 0});
const signedState1 = scenarios.threeWayLedgerState({turnNum: 1});
const signedState2 = scenarios.threeWayLedgerState({turnNum: 2});
const signedState3 = scenarios.threeWayLedgerState({turnNum: 3});
const signedState4 = scenarios.threeWayLedgerState({turnNum: 4});
const signedState5 = scenarios.threeWayLedgerState({turnNum: 5});
const signedState6 = scenarios.threeWayLedgerState({
  turnNum: 6,
  isFinal: true
});
const signedState7 = scenarios.threeWayLedgerState({
  turnNum: 7,
  isFinal: true
});
const signedState8 = scenarios.threeWayLedgerState({
  turnNum: 8,
  isFinal: true
});
const appData = signedState0.state.appData;
const participants = signedState0.state.channel.participants;

const initializeArgs = {
  outcome: scenarios.convertBalanceToOutcome(twoThreeTwo),
  participants,
  appDefinition,
  appData,
  processId,
  clearedToSend: true,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel)
};

const participantSharedData = createSharedDataFromParticipants([asAddress, bsAddress, hubAddress]);

const props = {
  ...initializeArgs,
  channelId
};

const propsA = {
  ...props,
  ourIndex: PlayerIndex.A
};

const propsB = {
  ...props,
  ourIndex: PlayerIndex.B,
  privateKey: bsPrivateKey
};

const propsHub = {
  ...props,
  ourIndex: PlayerIndex.Hub,
  privateKey: hubPrivateKey
};

const states0 = [signedState0];
const states1 = [signedState0, signedState1];
const states2 = [signedState0, signedState1, signedState2];
const states3 = [signedState1, signedState2, signedState3];
const states4 = [signedState2, signedState3, signedState4];
const states5 = [signedState3, signedState4, signedState5];
const states6 = [signedState4, signedState5, signedState6];
const states7 = [signedState5, signedState6, signedState7];
const states8 = [signedState6, signedState7, signedState8];

// ----
// States
// ------
const notSafeToSendA = states.notSafeToSend({
  ...propsA,
  stateType: StateType.PostFundSetup
});
const stateSentA = states.stateSent({
  ...propsA,
  stateType: StateType.PreFundSetup
});
const concludeStateSentA = states.stateSent({
  ...propsA,
  stateType: StateType.Conclude
});
const postFundStateSentA = states.stateSent({
  ...propsA,
  stateType: StateType.PostFundSetup
});

const waitingForConcludeB = states.notSafeToSend({
  ...propsB,
  stateType: StateType.Conclude
});

const waitForConcludeHub = states.notSafeToSend({
  ...propsHub,
  stateType: StateType.Conclude
});
const concludeStateSentB = states.stateSent({
  ...propsB,
  stateType: StateType.Conclude
});
const channelUnknownB = states.channelUnknown({
  ...propsB,
  stateType: StateType.PreFundSetup
});
const notSafeToSendB = states.notSafeToSend({
  ...propsB,
  stateType: StateType.PreFundSetup
});
const stateSentB = states.stateSent({
  ...propsB,
  stateType: StateType.PreFundSetup
});

const channelUnknownHub = states.channelUnknown({
  ...propsHub,
  stateType: StateType.PreFundSetup
});
const notSafeToSendHub = states.notSafeToSend({
  ...propsHub,
  stateType: StateType.PreFundSetup
});

// -------
// Shared Data
// -------

const emptySharedData = {
  ...participantSharedData,
  bytecodeStorage: {[CONSENSUS_LIBRARY_ADDRESS]: CONSENSUS_LIBRARY_BYTECODE}
};
// const channelCreated = { ...sharedData };
const aSentPreFundState = setChannels(participantSharedData, [
  channelFromStates(states0, asAddress, asPrivateKey)
]);

const bSentPreFundState = setChannels(participantSharedData, [
  channelFromStates(states1, bsAddress, bsPrivateKey)
]);

const bReceivedPreFundSetup = setChannels(participantSharedData, [
  channelFromStates(states2, bsAddress, bsPrivateKey)
]);

const hubSentPreFundState = setChannels(participantSharedData, [
  channelFromStates(states2, hubAddress, hubPrivateKey)
]);

const aReceivedPrefundSetup = setChannels(participantSharedData, [
  channelFromStates(states2, asAddress, asPrivateKey)
]);
const aSentPostFundState = setChannels(participantSharedData, [
  channelFromStates(states3, asAddress, asPrivateKey)
]);

const bSentPostFundSetupState = setChannels(participantSharedData, [
  channelFromStates(states4, bsAddress, bsPrivateKey)
]);

const allPostFundSetupsReceived = (playerIndex: PlayerIndex): SharedData => {
  const {address, privateKey} = scenarios.addressAndPrivateKeyLookup[playerIndex];
  return setChannels(participantSharedData, [channelFromStates(states5, address, privateKey)]);
};

const aSentConclude = (playerIndex: PlayerIndex): SharedData => {
  const {address, privateKey} = scenarios.addressAndPrivateKeyLookup[playerIndex];
  return setChannels(participantSharedData, [channelFromStates(states6, address, privateKey)]);
};
const bSentConclude = (playerIndex: PlayerIndex): SharedData => {
  const {address, privateKey} = scenarios.addressAndPrivateKeyLookup[playerIndex];
  return setChannels(participantSharedData, [channelFromStates(states7, address, privateKey)]);
};

const allConcludesReceived = (playerIndex: PlayerIndex): SharedData => {
  const {address, privateKey} = scenarios.addressAndPrivateKeyLookup[playerIndex];
  return setChannels(participantSharedData, [channelFromStates(states8, address, privateKey)]);
};

// -------
// Actions
// -------

const args = {
  processId,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel)
};

const receivePreFundSetupFromA = signedStatesReceived({
  ...args,
  signedStates: states0
});
const receivePreFundSetupFromB = signedStatesReceived({
  ...args,
  signedStates: states1
});
const receivePreFundSetupFromHub = signedStatesReceived({
  ...args,
  signedStates: states2
});

const receivePostFundSetupFromA = signedStatesReceived({
  ...args,
  signedStates: states3
});
const receivePostFundSetupFromB = signedStatesReceived({
  ...args,
  signedStates: states4
});
const receivePostFundSetupFromHub = signedStatesReceived({
  ...args,
  signedStates: states5
});
const receiveConcludeFromA = signedStatesReceived({
  ...args,
  signedStates: states6
});
const receiveConcludeFromB = signedStatesReceived({
  ...args,
  signedStates: states7
});
const receiveConcludeFromHub = signedStatesReceived({
  ...args,
  signedStates: states8
});
const clearSending = clearedToSend({
  processId,
  protocolLocator: []
});
// ---------
// Scenarios
// ---------
const initializeArgsA = {
  ...initializeArgs,
  address: asAddress,
  privateKey: asPrivateKey,
  ourIndex: PlayerIndex.A,
  stateType: StateType.PreFundSetup
};

const initializeArgsB = {
  ...initializeArgs,
  address: bsAddress,
  privateKey: bsPrivateKey,
  ourIndex: PlayerIndex.B,
  stateType: StateType.PreFundSetup
};

const initializeArgsHub = {
  ...initializeArgs,
  address: hubAddress,
  privateKey: hubPrivateKey,
  ourIndex: PlayerIndex.Hub,
  stateType: StateType.PreFundSetup
};

const existingArgs = {
  clearedToSend: true,
  channelId,
  processId,
  stateType: StateType.PostFundSetup,
  protocolLocator: makeLocator(EmbeddedProtocol.AdvanceChannel)
};

const existingArgsA = {...existingArgs, ourIndex: PlayerIndex.A};
const existingArgsB = {...existingArgs, ourIndex: PlayerIndex.B};
const existingArgsHub = {...existingArgs, ourIndex: PlayerIndex.Hub};

export const initialized = {
  ...propsA,
  state: stateSentA,
  sharedData: aSentPreFundState,
  trigger: receivePreFundSetupFromHub
};

export const preFund = {
  preSuccess: {
    ...propsA,
    state: stateSentA,
    sharedData: aSentPreFundState,
    trigger: receivePreFundSetupFromHub
  },
  success: {
    ...propsA,
    state: states.success({
      stateType: StateType.PreFundSetup,
      channelId
    }),
    sharedData: aReceivedPrefundSetup
  }
};
export const postFund = {
  preSuccess: {
    ...propsA,
    state: postFundStateSentA,
    sharedData: aSentPostFundState,
    trigger: receivePostFundSetupFromHub
  },
  success: {
    ...propsA,
    state: states.success({
      stateType: StateType.PreFundSetup,
      channelId
    }),
    sharedData: aReceivedPrefundSetup
  }
};
export const conclude = {
  preSuccess: {
    state: concludeStateSentA,
    sharedData: bSentConclude(PlayerIndex.A),
    trigger: receiveConcludeFromHub
  },
  success: {
    ...propsA,
    state: states.success({
      stateType: StateType.Conclude,
      channelId
    }),
    sharedData: allConcludesReceived
  }
};
export const newChannelAsA = {
  ...propsA,
  initialize: {
    args: initializeArgsA,
    sharedData: emptySharedData,
    states: states0
  },
  receiveFromB: {
    state: stateSentA,
    sharedData: aSentPreFundState,
    action: receivePreFundSetupFromB,
    states: states1
  },
  receiveFromHub: {
    state: stateSentA,
    sharedData: aSentPreFundState,
    action: receivePreFundSetupFromHub,
    states: states2
  }
};

export const existingChannelAsA = {
  ...propsA,
  stateType: StateType.PostFundSetup,
  initialize: {
    args: existingArgsA,
    sharedData: aReceivedPrefundSetup,
    states: states3
  },
  receiveFromB: {
    state: {...stateSentA, stateType: StateType.PostFundSetup},
    sharedData: aSentPostFundState,
    action: receivePostFundSetupFromB,
    states: states4
  },
  receiveFromHub: {
    state: {...stateSentA, stateType: StateType.PostFundSetup},
    sharedData: aSentPostFundState,
    action: receivePostFundSetupFromHub,
    states: states5
  }
};

export const concludingAsA = {
  ...propsA,
  stateType: StateType.Conclude,
  initialize: {
    args: {...existingArgsA, stateType: StateType.Conclude},
    sharedData: allPostFundSetupsReceived(PlayerIndex.A),
    states: states6
  },
  receiveFromB: {
    state: concludeStateSentA,
    sharedData: aSentConclude(PlayerIndex.A),
    action: receiveConcludeFromB,
    states: states7
  },
  receiveFromHub: {
    state: concludeStateSentA,
    sharedData: bSentConclude(PlayerIndex.A),
    action: receiveConcludeFromHub,
    states: states8
  }
};

export const newChannelAsB = {
  ...propsB,
  initialize: {
    args: initializeArgsB,
    sharedData: emptySharedData
  },
  receiveFromA: {
    state: channelUnknownB,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromA,
    states: states1
  },
  receiveFromHub: {
    state: stateSentB,
    sharedData: bSentPreFundState,
    action: receivePreFundSetupFromHub,
    states: states2
  }
};

export const existingChannelAsB = {
  ...propsB,
  stateType: StateType.PostFundSetup,
  initialize: {
    args: existingArgsB,
    sharedData: bReceivedPreFundSetup,
    states: states2
  },
  receiveFromA: {
    state: {...notSafeToSendB, stateType: StateType.PostFundSetup},
    sharedData: bSentPreFundState,
    action: receivePostFundSetupFromA,
    states: states4
  },
  receiveFromHub: {
    state: {...stateSentB, stateType: StateType.PostFundSetup},
    sharedData: bSentPostFundSetupState,
    action: receivePostFundSetupFromHub,
    states: states5
  }
};
export const concludingAsB = {
  ...propsB,
  stateType: StateType.Conclude,
  initialize: {
    args: {...existingArgsB, stateType: StateType.Conclude},
    sharedData: allPostFundSetupsReceived(PlayerIndex.B),
    states: states5
  },
  receiveFromA: {
    state: waitingForConcludeB,
    sharedData: allPostFundSetupsReceived(PlayerIndex.B),
    action: receiveConcludeFromA,
    states: states7
  },
  receiveFromHub: {
    state: concludeStateSentB,
    sharedData: bSentConclude(PlayerIndex.B),
    action: receiveConcludeFromHub,
    states: states8
  }
};

export const newChannelAsHub = {
  ...propsHub,
  initialize: {
    args: initializeArgsHub,
    sharedData: emptySharedData
  },
  receiveFromA: {
    state: channelUnknownHub,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromA,
    states: states0
  },
  receiveFromB: {
    state: channelUnknownHub,
    sharedData: emptySharedData,
    action: receivePreFundSetupFromB,
    states: states2
  }
};

export const existingChannelAsHub = {
  ...propsHub,
  stateType: StateType.PostFundSetup,
  initialize: {
    args: existingArgsHub,
    sharedData: hubSentPreFundState,
    states: states2
  },
  receiveFromB: {
    state: {...notSafeToSendHub, stateType: StateType.PostFundSetup},
    sharedData: hubSentPreFundState,
    action: receivePostFundSetupFromB,
    states: states5
  }
};
export const concludingAsHub = {
  ...propsHub,
  stateType: StateType.Conclude,
  initialize: {
    args: {...existingArgsB, stateType: StateType.Conclude},
    sharedData: allPostFundSetupsReceived(PlayerIndex.Hub),
    states: states5
  },
  receiveFromA: {
    state: waitForConcludeHub,
    sharedData: allPostFundSetupsReceived(PlayerIndex.Hub),
    action: receiveConcludeFromA,
    states: states6
  },
  receiveFromB: {
    state: waitForConcludeHub,
    sharedData: aSentConclude(PlayerIndex.Hub),
    action: receiveConcludeFromB,
    states: states8
  }
};

export const notClearedToSend = {
  ...propsA,
  stateType: StateType.PostFundSetup,
  initialize: {
    args: {...existingArgsA, clearedToSend: false},
    sharedData: aReceivedPrefundSetup,
    states: states2
  },
  clearedToSend: {
    state: {
      ...notSafeToSendA,
      stateType: StateType.PostFundSetup,
      clearedToSend: false
    },
    sharedData: aReceivedPrefundSetup,
    action: clearSending,
    states: states3
  },
  clearedToSendButUnsafe: {
    state: {
      ...notSafeToSendB,
      stateType: StateType.PostFundSetup,
      clearedToSend: false
    },
    sharedData: bSentPreFundState,
    action: clearSending,
    states: states1
  },
  clearedToSendButChannelUnknown: {
    state: {
      ...channelUnknownB,
      stateType: StateType.PreFundSetup,
      clearedToSend: false
    },
    sharedData: emptySharedData,
    action: clearSending
  },
  clearedToSendAndAlreadySent: {
    state: {
      ...stateSentB,
      stateType: StateType.PreFundSetup,
      clearedToSend: true
    },
    sharedData: bSentPreFundState,
    action: clearSending,
    states: states1
  }
};
