import {JsonRpcResponseAction} from "../actions";
import jrs from "jsonrpc-serializer";
import {call, select} from "redux-saga/effects";
import {unreachable} from "../../utils/reducer-utils";
import {getChannelStatus} from "../state";
import {ChannelState, getLastState} from "../channel-store";
import {createJsonRpcAllocationsFromOutcome} from "../../utils/json-rpc-utils";

export function* messageSender(action: JsonRpcResponseAction) {
  const message = yield createResponseMessage(action);
  yield call(window.parent.postMessage, message, "*");
}

function* createResponseMessage(action: JsonRpcResponseAction) {
  switch (action.type) {
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      const {channelId} = action;
      const channelStatus: ChannelState = yield select(getChannelStatus, channelId);
      const state = getLastState(channelStatus);

      const {participants} = channelStatus;
      const {appData, appDefinition, turnNum} = state;
      const funding = [];
      const status = "Opening";

      return jrs.success(action.id, {
        participants,
        allocations: createJsonRpcAllocationsFromOutcome(state.outcome),
        appDefinition,
        appData,
        status,
        funding,
        turnNum,
        channelId
      });
    case "WALLET.ADDRESS_RESPONSE":
      return jrs.success(action.id, action.address);
    default:
      return unreachable(action);
  }
}
