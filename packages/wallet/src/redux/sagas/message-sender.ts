import {JsonResponseAction} from "../actions";
import jrs from "jsonrpc-serializer";
import {call} from "redux-saga/effects";

export function* messageSender(action: JsonResponseAction) {
  const message = createResponseMessage(action);
  yield call(window.parent.postMessage, message, "*");
}

// This is exported so we can easily test it
export function createResponseMessage(action: JsonResponseAction) {
  switch (action.type) {
    case "WALLET.ADDRESS_CREATED":
      return jrs.success(action.id, action.address);
    default:
      return jrs.error(action.id, new jrs.err.MethodNotFoundError());
  }
}
