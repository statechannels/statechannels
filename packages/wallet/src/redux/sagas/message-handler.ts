import {put} from "redux-saga/effects";

import * as actions from "../actions";
import jrs, {RequestPayloadObject} from "jsonrpc-serializer";

export function* messageHandler(jsonRpcMessage: string, fromDomain: string) {
  const parsedMessage = jrs.deserialize(jsonRpcMessage);
  switch (parsedMessage.type) {
    case "notification":
    case "success":
      console.warn(`Received unexpected JSON-RPC message ${jsonRpcMessage}`);
      break;
    case "error":
      throw new Error("TODO: Respond with error message");
    case "request":
      yield handleMessage(parsedMessage.payload as RequestPayloadObject, fromDomain);
      break;
  }
}

function* handleMessage(payload: jrs.RequestPayloadObject, domain: string) {
  const {id} = payload;
  switch (payload.method) {
    case "GetAddress":
      yield put(actions.addressRequest({id, domain}));
      break;
  }
}
