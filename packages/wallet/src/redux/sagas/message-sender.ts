import {JsonRpcResponseAction} from "../actions";

import {call, select} from "redux-saga/effects";
import {getChannelStatus} from "../state";
import {ChannelState, getLastState} from "../channel-store";
import {createJsonRpcAllocationsFromOutcome} from "../../utils/json-rpc-utils";
import jrs from "jsonrpc-lite";
import {unreachable} from "../../utils/reducer-utils";

export function* messageSender(action: JsonRpcResponseAction) {
  const message = yield createResponseMessage(action);
  yield call(window.parent.postMessage, JSON.stringify(message), "*");
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
    case "WALLET.NO_CONTRACT_ERROR":
      return jrs.error(action.id, new jrs.JsonRpcError("Invalid app definition", 1001));
    case "WALLET.UNKNOWN_SIGNING_ADDRESS_ERROR":
      return jrs.error(
        action.id,
        new jrs.JsonRpcError("Signing address not found in the participants array", 1000)
      );
    default:
      return unreachable(action);
  }
}
