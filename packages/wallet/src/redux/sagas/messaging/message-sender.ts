import {bigNumberify} from "ethers/utils";
import jrs from "jsonrpc-lite";
import {call, select} from "redux-saga/effects";
import {validateNotification, validateResponse} from "../../../json-rpc-validation/validator";
import {createJsonRpcAllocationsFromOutcome} from "../../../utils/json-rpc-utils";
import {unreachable} from "../../../utils/reducer-utils";

import {ChannelState, getLastState, getPenultimateState} from "../../channel-store";
import {getChannelHoldings, getLastSignedStateForChannel, getProtocolState} from "../../selectors";
import {getChannelStatus} from "../../state";
import {OutgoingApiAction} from "./outgoing-api-actions";
import {State} from "@statechannels/nitro-protocol";

import {isResponderState} from "../../protocols/dispute/responder/states";
import {isChallengerState} from "../../protocols/dispute/challenger/states";
import {ProtocolState} from "src/redux/protocols";

export function* messageSender(action: OutgoingApiAction) {
  const message = yield createResponseMessage(action);
  if (message) {
    yield validate(message, action);
    yield call([window.parent, window.parent.postMessage], message, "*");
  }
}

function* createResponseMessage(action: OutgoingApiAction) {
  switch (action.type) {
    case "WALLET.JOIN_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.CLOSE_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.UPDATE_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.CHALLENGE_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.ADDRESS_RESPONSE":
      return jrs.success(action.id, action.address);
    case "WALLET.NO_CONTRACT_ERROR":
      return jrs.error(action.id, new jrs.JsonRpcError("Invalid app definition", 1001));
    case "WALLET.VALIDATION_ERROR":
      return jrs.error(action.id, jrs.JsonRpcError.invalidRequest(undefined));
    case "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR":
      return jrs.error(
        action.id,
        new jrs.JsonRpcError("Signing address not found in the participants array", 1000)
      );
    case "WALLET.RELAY_ACTION_WITH_MESSAGE":
      return jrs.notification("MessageQueued", {
        recipient: action.toParticipantId,
        sender: action.fromParticipantId,
        data: action.actionToRelay
      });
    case "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE":
      const proposedChannelStatus: ChannelState = yield select(getChannelStatus, action.channelId);

      const openRequest = {
        type: "Channel.Open",
        signedState: proposedChannelStatus.signedStates.slice(-1)[0],
        participants: proposedChannelStatus.participants
      };
      return jrs.notification("MessageQueued", {
        recipient: action.toParticipantId,
        sender: action.fromParticipantId,
        data: openRequest
      });
    case "WALLET.SEND_CHANNEL_JOINED_MESSAGE":
      const joinChannelState: ChannelState = yield select(getChannelStatus, action.channelId);
      const joinedMessage = {
        type: "Channel.Joined",
        signedState: joinChannelState.signedStates.slice(-1)[0],
        participants: joinChannelState.participants
      };
      return jrs.notification("MessageQueued", {
        recipient: action.toParticipantId,
        sender: action.fromParticipantId,
        data: joinedMessage
      });
    case "WALLET.SEND_CHANNEL_UPDATED_MESSAGE":
      const channelUpdated = {
        type: "Channel.Updated",
        signedState: yield select(getLastSignedStateForChannel, action.channelId)
      };
      return jrs.notification("MessageQueued", {
        recipient: action.toParticipantId,
        sender: action.fromParticipantId,
        data: channelUpdated
      });
    case "WALLET.CHANNEL_UPDATED_EVENT":
      return jrs.notification("ChannelUpdated", yield getChannelInfo(action.channelId));
    case "WALLET.CHANNEL_PROPOSED_EVENT":
      return jrs.notification("ChannelProposed", yield getChannelInfo(action.channelId));
    case "WALLET.PUSH_MESSAGE_RESPONSE":
      return jrs.success(action.id, {success: true});
    case "WALLET.UNKNOWN_CHANNEL_ID_ERROR":
      return jrs.error(
        action.id,
        new jrs.JsonRpcError(
          "The wallet can't find the channel corresponding to the channelId",
          1000
        )
      );
    case "WALLET.API_NOT_IMPLEMENTED":
      console.warn(`No API method implemented for ${action.apiMethod}`);
      return undefined;
    default:
      return unreachable(action);
  }
}

function* validate(message: any, action: OutgoingApiAction) {
  if (!("error" in message)) {
    let result;
    if ("id" in message) {
      result = yield validateResponse(message);
    } else {
      result = yield validateNotification(message);
    }
    if (!result.isValid) {
      console.error(`Outgoing message validation failed.`);
      console.error(`Action\n${JSON.stringify(action, null, 2)}`);
      console.error(`Message\n${JSON.stringify(message, null, 2)}`);
      console.error(`Validation Errors\n${JSON.stringify(result.errors, null, 2)}`);
      throw new Error("Validation Failed");
    }
  }
}

function* getChannelInfo(channelId: string) {
  const channelStatus: ChannelState = yield select(getChannelStatus, channelId);
  const state = getLastState(channelStatus);
  const previousState = getPenultimateState(channelStatus);

  const {participants} = channelStatus;
  const {appData, appDefinition, turnNum} = state;

  const channelHoldings = yield select(getChannelHoldings, channelId);
  let funding: any[] = [];

  // TODO: For now we assume ETH
  if (!bigNumberify(channelHoldings).isZero()) {
    funding = [{token: "0x0", amount: channelHoldings}];
  }

  const {status, challengeExpirationTime} = yield getChannelInfoStatus(state, previousState);

  return {
    participants,
    allocations: createJsonRpcAllocationsFromOutcome(state.outcome),
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId,
    challengeExpirationTime
  };
}

function* getChannelInfoStatus(currentState: State, previousState: State) {
  if (currentState.isFinal) {
    if (previousState.isFinal) {
      return {status: "closed"};
    } else {
      return {status: "closing"};
    }
  } else if (currentState.turnNum === 0) {
    return {status: "proposed"};
  } else if (currentState.turnNum < currentState.channel.participants.length - 1) {
    return {status: "opening"};
  }

  // TODO: This only works for a single process at a time...
  const protocolState: ProtocolState | undefined = yield select(getProtocolState, "Application");

  if (
    protocolState &&
    protocolState.type === "Application.WaitForDispute" &&
    typeof protocolState.disputeState !== "undefined"
  ) {
    if (isChallengerState(protocolState.disputeState)) {
      return {
        status: "challenging",
        challengeExpirationTime: (protocolState.disputeState as any).expiryTime
      };
    } else if (isResponderState(protocolState.disputeState)) {
      return {
        status: "responding",
        challengeExpirationTime: (protocolState.disputeState as any).expiryTime
      };
    }
  }

  return {status: "running"};
}
