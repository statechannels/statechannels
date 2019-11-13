import {select, fork, put} from "redux-saga/effects";

import * as actions from "../actions";
import jrs, {RequestPayloadObject} from "jsonrpc-serializer";
import {getAddress} from "../selectors";
import {messageSender} from "./message-sender";
import {getChannelId} from "@statechannels/nitro-protocol";
import {APPLICATION_PROCESS_ID} from "../protocols/application/reducer";
import {createStateFromCreateChannelParams} from "../../utils/json-rpc-utils";

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
      yield handleMessage(parsedMessage.payload as RequestPayloadObject);
      break;
  }
}

function* handleMessage(payload: jrs.RequestPayloadObject) {
  const {id} = payload;
  switch (payload.method) {
    case "GetAddress":
      const address = yield select(getAddress);
      yield fork(messageSender, actions.addressResponse({id, address}));

      break;
    case "CreateChannel":
      const {participants} = payload.params;
      const state = createStateFromCreateChannelParams(payload.params);

      yield put(
        actions.protocol.initializeChannel({channelId: getChannelId(state.channel), participants})
      );
      yield put(
        actions.application.ownStateReceived({
          processId: APPLICATION_PROCESS_ID,
          state
        })
      );
      // TODO: Need to handle the case where something goes wrong

      yield fork(
        messageSender,
        actions.createChannelResponse({
          id,
          channelId: getChannelId(state.channel)
        })
      );
  }
}
