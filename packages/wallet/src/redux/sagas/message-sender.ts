import {OutgoingJsonRpcAction} from "../actions";

import {call, select} from "redux-saga/effects";
import {getChannelStatus} from "../state";
import {ChannelState, getLastState} from "../channel-store";
import {createJsonRpcAllocationsFromOutcome} from "../../utils/json-rpc-utils";
import jrs from "jsonrpc-lite";
import {unreachable} from "../../utils/reducer-utils";

export function* messageSender(action: OutgoingJsonRpcAction) {
  const message = yield createResponseMessage(action);
  yield call(window.parent.postMessage, JSON.stringify(message), "*");
}

function* createResponseMessage(action: OutgoingJsonRpcAction) {
  switch (action.type) {
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      const channelInfo = yield getChannelInfo(action.channelId);
      return jrs.success(action.id, {...channelInfo});
    case "WALLET.UPDATE_CHANNEL_RESPONSE":
      return jrs.success(action.id, action.state);
    case "WALLET.ADDRESS_RESPONSE":
      return jrs.success(action.id, action.address);
    case "WALLET.NO_CONTRACT_ERROR":
      return jrs.error(action.id, new jrs.JsonRpcError("Invalid app definition", 1001));
    case "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR":
      return jrs.error(
        action.id,
        new jrs.JsonRpcError("Signing address not found in the participants array", 1000)
      );
    case "WALLET.SEND_CHANNEL_PROPOSED_MESSAGE":
      const channelStatus: ChannelState = yield select(getChannelStatus, action.channelId);

      const request = {
        type: "Channel.Open",
        signedState: channelStatus.signedStates.slice(-1)[0],
        participants: channelStatus.participants
      };
      return jrs.notification("MessageQueued", {
        recipient: action.fromParticipantId,
        sender: action.toParticipantId,
        data: request
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
    default:
      return unreachable(action);
  }
}

function* getChannelInfo(channelId: string) {
  const channelStatus: ChannelState = yield select(getChannelStatus, channelId);
  const state = getLastState(channelStatus);

  const {participants} = channelStatus;
  const {appData, appDefinition, turnNum} = state;
  const funding = [];
  const status = "Opening";
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
