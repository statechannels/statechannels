import {OutgoingApiAction, messageSent} from "../actions";

import {call, select, put} from "redux-saga/effects";
import {getChannelStatus} from "../state";
import {ChannelState, getLastState} from "../channel-store";
import {createJsonRpcAllocationsFromOutcome} from "../../utils/json-rpc-utils";
import jrs from "jsonrpc-lite";
import {unreachable} from "../../utils/reducer-utils";
import {validateResponse, validateNotification} from "../../json-rpc-validation/validator";

export function* messageSender(action: OutgoingApiAction) {
  const message = yield createResponseMessage(action);
  if (message) {
    yield validate(message, action);
    yield call([window.parent, window.parent.postMessage], message, "*");
    yield put(messageSent({}));
  }
}

function* createResponseMessage(action: OutgoingApiAction) {
  switch (action.type) {
    case "WALLET.JOIN_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      return jrs.success(action.id, yield getChannelInfo(action.channelId));
    case "WALLET.UPDATE_CHANNEL_RESPONSE":
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
        recipient: action.fromParticipantId,
        sender: action.toParticipantId,
        data: action.actionToRelay
      });
      break;
    case "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE":
      const proposedChannelStatus: ChannelState = yield select(getChannelStatus, action.channelId);

      const openRequest = {
        type: "Channel.Open",
        signedState: proposedChannelStatus.signedStates.slice(-1)[0],
        participants: proposedChannelStatus.participants
      };
      return jrs.notification("MessageQueued", {
        recipient: action.fromParticipantId,
        sender: action.toParticipantId,
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
        recipient: action.fromParticipantId,
        sender: action.toParticipantId,
        data: joinedMessage
      });
    case "WALLET.CHANNEL_PROPOSED_EVENT":
      return jrs.notification("ChannelProposed", yield getChannelInfo(action.channelId));
    case "WALLET.POST_MESSAGE_RESPONSE":
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
      console.error(`No API method implemented for ${action.apiMethod}`);
      return undefined;
      break;
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
      console.error(`Action\n${JSON.stringify(action)}`);
      console.error(`Message\n${JSON.stringify(message)}`);
      console.error(`Validation Errors\n${JSON.stringify(result.errors)}`);
      throw new Error("Validation Failed");
    }
  }
}

function* getChannelInfo(channelId: string) {
  const channelStatus: ChannelState = yield select(getChannelStatus, channelId);
  const state = getLastState(channelStatus);

  const {participants} = channelStatus;
  const {appData, appDefinition, turnNum} = state;
  const funding = [];
  const status = channelStatus.turnNum < participants.length - 1 ? "Opening" : "Running";
  return {
    participants,
    allocations: createJsonRpcAllocationsFromOutcome(state.outcome),
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId
  };
}
