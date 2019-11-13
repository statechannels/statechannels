import {JsonRpcResponseAction} from "../actions";
import jrs from "jsonrpc-serializer";
import {call} from "redux-saga/effects";
import {unreachable} from "../../utils/reducer-utils";

export function* messageSender(action: JsonRpcResponseAction) {
  const message = createResponseMessage(action);
  yield call(window.parent.postMessage, message, "*");
}

// This is exported so we can easily test it
export function createResponseMessage(action: JsonRpcResponseAction) {
  switch (action.type) {
    // TODO: If we switch this to a saga the action could just have a channelId
    // We could look up the rest using a selector
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      const {
        participants,
        allocations,
        appDefinition,
        appData,
        status,
        funding,
        turnNum,
        channelId
      } = action;
      return jrs.success(action.id, {
        participants,
        allocations,
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
