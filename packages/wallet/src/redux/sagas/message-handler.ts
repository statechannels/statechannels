import {select, fork} from "redux-saga/effects";

import * as actions from "../actions";
import jrs, {RequestPayloadObject} from "jsonrpc-serializer";
import {getAddress} from "../selectors";
import {messageSender} from "./message-sender";

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
      const address = yield select(getAddress);
      yield fork(messageSender, actions.addressResponse({id, address}));

      break;
  }
}
