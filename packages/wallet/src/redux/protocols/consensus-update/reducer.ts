import {SharedData, getExistingChannel, signAndStore} from "../../state";
import * as states from "./states";
import {ProtocolStateWithSharedData} from "..";
import {ConsensusUpdateAction} from "./actions";
import * as helpers from "../reducer-helpers";

import {SignedStatesReceived, ProtocolLocator} from "../../../communication";
import {unreachable} from "../../../utils/reducer-utils";
import {ChannelState} from "../../channel-store";
import {
  Outcome,
  State,
  encodeOutcome,
  decodeConsensusData,
  encodeConsensusData,
  ConsensusData
} from "@statechannels/nitro-protocol";

export {CONSENSUS_UPDATE_PROTOCOL_LOCATOR} from "../../../communication/protocol-locator";

export const initialize = ({
  processId,
  channelId,
  clearedToSend,
  proposedOutcome,
  protocolLocator,
  sharedData
}: {
  processId: string;
  channelId: string;
  clearedToSend: boolean;
  proposedOutcome: Outcome;
  protocolLocator: ProtocolLocator;
  sharedData: SharedData;
}): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  return sendIfSafe(
    states.notSafeToSend({
      processId,
      channelId,
      proposedOutcome,
      clearedToSend,
      protocolLocator
    }),
    sharedData
  );
};

export const consensusUpdateReducer = (
  protocolState: states.ConsensusUpdateState,
  sharedData: SharedData,
  action: ConsensusUpdateAction
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (states.isTerminal(protocolState)) {
    console.warn(`Consensus update reducer was called with terminal state ${protocolState.type}`);
    return {protocolState, sharedData};
  }

  switch (action.type) {
    case "WALLET.COMMON.SIGNED_STATES_RECEIVED":
      return handleStateReceived(protocolState, sharedData, action);
    case "WALLET.CONSENSUS_UPDATE.CLEARED_TO_SEND":
      return handleClearedToSend(protocolState, sharedData);
    default:
      return unreachable(action);
  }
};

const handleClearedToSend = (
  protocolState: states.NonTerminalConsensusUpdateState,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  if (protocolState.type !== "ConsensusUpdate.NotSafeToSend") {
    console.warn(`Expected NotSafeToSend state received ${protocolState.type} instead`);
    return {protocolState, sharedData};
  }

  protocolState = {...protocolState, clearedToSend: true};
  return sendIfSafe(protocolState, sharedData);
};

const handleStateReceived = (
  protocolState: states.NonTerminalConsensusUpdateState,
  sharedData: SharedData,
  action: SignedStatesReceived
): ProtocolStateWithSharedData<states.ConsensusUpdateState> => {
  const {channelId} = protocolState;

  try {
    const {turnNum} = getExistingChannel(sharedData, channelId);
    sharedData = helpers.checkStates(sharedData, turnNum, action.signedStates);
  } catch (err) {
    console.error(err.message);
  }

  return sendIfSafe(protocolState, sharedData);
};

function sendIfSafe(
  protocolState: states.NonTerminalConsensusUpdateState,
  sharedData: SharedData
): ProtocolStateWithSharedData<states.ConsensusUpdateState> {
  const {channelId, processId, proposedOutcome, protocolLocator} = protocolState;
  if (consensusReached(getExistingChannel(sharedData, channelId), proposedOutcome)) {
    return {protocolState: states.success({}), sharedData};
  }

  if (!helpers.ourTurn(sharedData, channelId)) {
    return {protocolState, sharedData};
  }

  switch (protocolState.type) {
    case "ConsensusUpdate.StateSent":
      return {
        protocolState: states.failure({reason: states.FailureReason.ConsensusNotReached}),
        sharedData
      };
    case "ConsensusUpdate.NotSafeToSend":
      const {clearedToSend} = protocolState;
      if (!clearedToSend) {
        return {protocolState, sharedData};
      }
      try {
        if (
          proposalStateHasExpectedValues(
            helpers.getLatestState(channelId, sharedData),
            proposedOutcome
          )
        ) {
          sharedData = sendAcceptConsensus(processId, channelId, protocolLocator, sharedData);
        } else {
          sharedData = sendProposal(
            processId,
            channelId,
            proposedOutcome,
            protocolLocator,
            sharedData
          );
        }
      } catch (error) {
        return {
          protocolState: states.failure({
            reason: states.FailureReason.Error,
            error: error.message
          }),
          sharedData
        };
      }

      // If we are the last player we would be the one reaching consensus so we check again
      if (consensusReached(getExistingChannel(sharedData, channelId), proposedOutcome)) {
        return {protocolState: states.success({}), sharedData};
      } else {
        return {
          protocolState: states.stateSent(protocolState),
          sharedData
        };
      }
    default:
      return unreachable(protocolState);
  }
}

function consensusReached(channel: ChannelState, expectedOutcome: Outcome): boolean {
  const {signedStates} = channel;

  return !!signedStates.find(ss => {
    const consensusData = decodeConsensusData(ss.state.appData);
    return (
      consensusData.furtherVotesRequired === 0 &&
      encodeOutcome(ss.state.outcome) === encodeOutcome(expectedOutcome)
    );
  });
}

function proposalStateHasExpectedValues(state: State, expectedOutcome: Outcome): boolean {
  const consensusData = decodeConsensusData(state.appData);
  return encodeOutcome(consensusData.proposedOutcome) === encodeOutcome(expectedOutcome);
}
function sendAcceptConsensus(
  processId: string,
  channelId: string,
  protocolLocator: ProtocolLocator,
  sharedData: SharedData
): SharedData {
  const lastState = helpers.getLatestState(channelId, sharedData);

  const ourState = acceptConsensus(lastState);

  const signResult = signAndStore(sharedData, ourState);
  if (!signResult.isSuccess) {
    throw new Error("Signature Failure");
  }
  sharedData = signResult.store;
  sharedData = helpers.sendStates(sharedData, processId, channelId, protocolLocator);
  return sharedData;
}

function sendProposal(
  processId: string,
  channelId: string,
  proposedOutcome: Outcome,
  protocolLocator: ProtocolLocator,
  sharedData: SharedData
): SharedData {
  const lastState = helpers.getLatestState(channelId, sharedData);
  const ourState = proposeConsensus(lastState, proposedOutcome);
  const signResult = signAndStore(sharedData, ourState);
  if (!signResult.isSuccess) {
    throw new Error("SignatureFailure");
  }
  sharedData = signResult.store;

  sharedData = helpers.sendStates(sharedData, processId, channelId, protocolLocator);
  return sharedData;
}

function proposeConsensus(state: State, proposedOutcome: Outcome): State {
  const consensusData: ConsensusData = {
    furtherVotesRequired: state.channel.participants.length - 1,
    proposedOutcome
  };
  return {
    ...state,
    turnNum: state.turnNum + 1,
    appData: encodeConsensusData(consensusData)
  };
}
function acceptConsensus(state: State): State {
  const consensusData = decodeConsensusData(state.appData);

  if (consensusData.furtherVotesRequired === 1) {
    return {
      ...state,
      turnNum: state.turnNum + 1,
      outcome: consensusData.proposedOutcome,
      appData: encodeConsensusData({proposedOutcome: [], furtherVotesRequired: 0})
    };
  } else {
    return {
      ...state,
      turnNum: state.turnNum + 1,
      appData: encodeConsensusData({
        ...consensusData,
        furtherVotesRequired: consensusData.furtherVotesRequired - 1
      })
    };
  }
}
