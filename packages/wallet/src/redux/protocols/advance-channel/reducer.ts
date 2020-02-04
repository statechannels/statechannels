import {State, Channel, getChannelId} from "@statechannels/nitro-protocol";

import {bigNumberify} from "ethers/utils";

import {
  getChannel,
  ChannelState,
  getLastState,
  getPenultimateState,
  getStates
} from "../../channel-store";
import {WalletAction} from "../../actions";
import * as selectors from "../../selectors";
import {SignedStatesReceived} from "../../../communication";

import {unreachable} from "../../../utils/reducer-utils";
import {Properties} from "../../utils";
import * as helpers from "../reducer-helpers";

import {
  SharedData,
  registerChannelToMonitor,
  getExistingChannel,
  signAndStore,
  signAndInitialize,
  checkAndInitialize
} from "../../state";
import {NETWORK_ID, CHALLENGE_DURATION} from "../../../constants";

import {isAdvanceChannelAction} from "./actions";

import * as states from "./states";

import {ProtocolStateWithSharedData, ProtocolReducer} from "..";

export {ADVANCE_CHANNEL_PROTOCOL_LOCATOR} from "../../../communication/protocol-locator";

type ReturnVal = ProtocolStateWithSharedData<states.AdvanceChannelState>;
type Storage = SharedData;

export function initialize(
  sharedData: Storage,
  args: OngoingChannelArgs | NewChannelArgs
): ReturnVal {
  const {stateType, processId} = args;
  if (stateType === states.StateType.PreFundSetup) {
    if (!isNewChannelArgs(args)) {
      throw new Error("Must receive NewChannelArgs");
    }
    return initializeWithNewChannel(processId, sharedData, args);
  } else {
    if (isNewChannelArgs(args)) {
      throw new Error("Must receive OngoingChannelArgs");
    }

    return initializeWithExistingChannel(processId, sharedData, args);
  }
}

export const reducer: ProtocolReducer<states.AdvanceChannelState> = (
  protocolState: states.NonTerminalAdvanceChannelState,
  sharedData: SharedData,
  action: WalletAction
) => {
  if (!isAdvanceChannelAction(action)) {
    console.error("Invalid action: expected WALLET.COMMON.SIGNED_STATES_RECEIVED");
    return {protocolState, sharedData};
  }

  switch (action.type) {
    case "WALLET.ADVANCE_CHANNEL.CLEARED_TO_SEND":
      return clearedToSendReducer(protocolState, sharedData);
    case "WALLET.COMMON.SIGNED_STATES_RECEIVED":
      switch (protocolState.type) {
        case "AdvanceChannel.ChannelUnknown": {
          return channelUnknownReducer(protocolState, sharedData, action);
        }
        case "AdvanceChannel.NotSafeToSend": {
          return notSafeToSendReducer(protocolState, sharedData, action);
        }
        case "AdvanceChannel.StateSent": {
          return stateSentReducer(protocolState, sharedData, action);
        }
        default:
          return unreachable(protocolState);
      }
    default:
      return unreachable(action);
  }
};

function clearedToSendReducer(protocolState: states.AdvanceChannelState, sharedData: SharedData) {
  if (protocolState.type === "AdvanceChannel.NotSafeToSend") {
    protocolState = {...protocolState, clearedToSend: true};
    if (protocolState.type === "AdvanceChannel.NotSafeToSend") {
      return attemptToAdvanceChannel(sharedData, protocolState, protocolState.channelId);
    } else {
      return {sharedData, protocolState};
    }
  } else if (protocolState.type === "AdvanceChannel.ChannelUnknown") {
    return {
      sharedData,
      protocolState: states.channelUnknown({...protocolState, clearedToSend: true})
    };
  } else {
    return {protocolState, sharedData};
  }
}

type NewChannelArgs = Properties<states.ChannelUnknown>;
type OngoingChannelArgs = Properties<states.NotSafeToSend>;

function isNewChannelArgs(args: OngoingChannelArgs | NewChannelArgs): args is NewChannelArgs {
  if ("privateKey" in args) {
    return true;
  }
  return false;
}

function initializeWithNewChannel(
  processId,
  sharedData: Storage,
  initializeChannelArgs: NewChannelArgs
) {
  const {
    appDefinition,
    appData,
    outcome,
    ourIndex,
    clearedToSend,
    protocolLocator,
    participants,
    privateKey
  } = initializeChannelArgs;

  if (helpers.isSafeToSend({sharedData, ourIndex, clearedToSend})) {
    // Initialize the channel in the store

    const channel: Channel = {
      channelNonce: selectors.getNextNonce(sharedData, appDefinition),
      participants,
      chainId: bigNumberify(NETWORK_ID).toHexString()
    };
    const ourState: State = {
      turnNum: 0,
      isFinal: false,
      appData,
      outcome,
      channel,
      appDefinition,
      challengeDuration: CHALLENGE_DURATION
    };

    const signResult = signAndInitialize(
      sharedData,
      ourState,
      privateKey,
      participants.map(p => {
        return {signingAddress: p};
      })
    );
    if (!signResult.isSuccess) {
      throw new Error("Could not store new ledger channel state.");
    }
    sharedData = signResult.store;

    // Register channel to monitor
    const channelId = getChannelId(ourState.channel);
    sharedData = registerChannelToMonitor(sharedData, processId, channelId, protocolLocator);

    // Send states to next participant
    sharedData = helpers.sendStates(sharedData, processId, channelId, protocolLocator);
    const protocolState = states.stateSent({
      ...initializeChannelArgs,
      processId,
      channelId
    });
    return {
      protocolState,
      sharedData
    };
  } else {
    const protocolState = states.channelUnknown({
      ...initializeChannelArgs,
      processId
    });

    return {protocolState, sharedData};
  }
}

function initializeWithExistingChannel(
  processId,
  sharedData: Storage,
  initializeChannelArgs: OngoingChannelArgs
) {
  const {channelId, ourIndex, clearedToSend, protocolLocator} = initializeChannelArgs;
  const channel = getChannel(sharedData.channelStore, channelId);
  if (helpers.isSafeToSend({sharedData, ourIndex, clearedToSend, channelId})) {
    const ourState = nextState(channel, initializeChannelArgs.stateType);

    const signResult = signAndStore(sharedData, ourState);
    if (!signResult.isSuccess) {
      throw new Error("Could not store new ledger channel state.");
    }
    sharedData = signResult.store;

    sharedData = helpers.sendStates(sharedData, processId, channelId, protocolLocator);

    const protocolState = states.stateSent({
      ...initializeChannelArgs,
      processId,
      channelId
    });
    return {
      protocolState,
      sharedData
    };
  } else {
    return {protocolState: states.notSafeToSend(initializeChannelArgs), sharedData};
  }
}

function attemptToAdvanceChannel(
  sharedData: SharedData,
  protocolState: states.ChannelUnknown | states.NotSafeToSend,
  channelId: string
): {sharedData: SharedData; protocolState: states.AdvanceChannelState} {
  const {ourIndex, stateType, clearedToSend, protocolLocator, processId} = protocolState;

  let channel = getChannel(sharedData.channelStore, channelId);
  if (helpers.isSafeToSend({sharedData, ourIndex, channelId, clearedToSend})) {
    // First, update the store with our response
    const ourState = nextState(channel, protocolState.stateType);

    const signResult = signAndStore(sharedData, ourState);
    if (!signResult.isSuccess) {
      throw new Error(`Could not sign result: ${signResult.reason}`);
    }
    sharedData = signResult.store;

    // Finally, send the states to the next participant
    channel = getChannel(sharedData.channelStore, channelId);

    sharedData = helpers.sendStates(sharedData, processId, channelId, protocolLocator);
    channel = getExistingChannel(sharedData, channelId);
    if (channelAdvanced(channel, stateType)) {
      return {protocolState: states.success({...protocolState, channelId}), sharedData};
    } else {
      return {protocolState: states.stateSent({...protocolState, channelId}), sharedData};
    }
  } else {
    return {protocolState, sharedData};
  }
}

const channelUnknownReducer = (
  protocolState: states.ChannelUnknown,
  sharedData,
  action: SignedStatesReceived
) => {
  const {privateKey, participants} = protocolState;
  const channelId = getChannelId(action.signedStates[0].state.channel);

  const checkResult = checkAndInitialize(
    sharedData,
    action.signedStates[0],
    privateKey,
    participants.map(p => {
      return {signingAddress: p};
    })
  );
  if (!checkResult.isSuccess) {
    throw new Error("Could not initialize channel");
  }
  sharedData = checkResult.store;
  sharedData = helpers.checkStates(sharedData, 0, action.signedStates);

  const result = attemptToAdvanceChannel(sharedData, protocolState, channelId);
  sharedData = result.sharedData;
  const nextProtocolState = result.protocolState; // The type might have changed, so we can't overwrite protocolState
  if (
    nextProtocolState.type === "AdvanceChannel.StateSent" ||
    nextProtocolState.type === "AdvanceChannel.Success"
  ) {
    sharedData = registerChannelToMonitor(
      sharedData,
      protocolState.processId,
      channelId,
      protocolState.protocolLocator
    );
  }

  return {protocolState: nextProtocolState, sharedData};
};

const notSafeToSendReducer = (
  protocolState: states.NotSafeToSend,
  sharedData,
  action: SignedStatesReceived
) => {
  const {channelId} = protocolState;

  const channel = getChannel(sharedData.channelStore, channelId);
  sharedData = helpers.checkStates(sharedData, channel.turnNum, action.signedStates);

  return attemptToAdvanceChannel(sharedData, protocolState, channelId);
};

const stateSentReducer = (
  protocolState: states.StateSent,
  sharedData,
  action: SignedStatesReceived
) => {
  const {channelId, stateType} = protocolState;

  let channel = getChannel(sharedData.channelStore, channelId);
  sharedData = helpers.checkStates(sharedData, channel.turnNum, action.signedStates);

  channel = getChannel(sharedData.channelStore, channelId);
  if (channelAdvanced(channel, stateType)) {
    return {protocolState: states.success(protocolState), sharedData};
  }

  return {protocolState, sharedData};
};

function channelAdvanced(channel: ChannelState, stateType: states.StateType): boolean {
  const lastState = getLastState(channel);
  const {participants} = channel;
  switch (stateType) {
    case states.StateType.PreFundSetup:
      return lastState.turnNum >= participants.length - 1;
    case states.StateType.PostFundSetup:
      return lastState.turnNum >= 2 * participants.length - 1;
    case states.StateType.Conclude:
      const signedStates = getStates(channel);
      return signedStates.filter(ss => ss.state.isFinal).length >= participants.length;
    default:
      return false;
  }
}

function nextState(channel: ChannelState, stateType: states.StateType): State {
  const lastState = getLastState(channel);
  const penultimateState = lastState.turnNum > 0 ? getPenultimateState(channel) : undefined;
  if (stateType === states.StateType.Conclude) {
    if (!penultimateState) {
      throw new Error("Attempted to conclude a channel that only contains a setup state");
    }
    return nextConcludeState(lastState);
  } else {
    return nextSetupState(lastState);
  }
}

function nextSetupState(state: State): State {
  const turnNum = state.turnNum + 1;
  const numParticipants = state.channel.participants.length;

  if (turnNum > 2 * numParticipants - 1) {
    throw new Error("State was not a setup state");
  }

  return {...state, turnNum};
}

function nextConcludeState(lastState: State): State {
  const turnNum = lastState.turnNum + 1;
  if (lastState.channel.participants.length < 2 || lastState.channel.participants.length > 3) {
    throw new Error("nextConcludeState only handles 2 or 3 players");
  }

  return {...lastState, turnNum, isFinal: true};
}
