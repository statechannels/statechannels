import {select, fork, put, call} from "redux-saga/effects";
import {getChannelId, State} from "@statechannels/nitro-protocol";
import jrs, {RequestObject} from "jsonrpc-lite";

import * as actions from "../actions";
import {getAddress, getLastStateForChannel, doesAStateExistForChannel} from "../selectors";
import {messageSender} from "./message-sender";
import {APPLICATION_PROCESS_ID} from "../protocols/application/reducer";
import {
  createStateFromCreateChannelParams,
  createStateFromUpdateChannelParams
} from "../../utils/json-rpc-utils";
import {getProvider} from "../../utils/contract-utils";

export function* messageHandler(jsonRpcMessage: string, fromDomain: string) {
  const parsedMessage = jrs.parseObject(JSON.parse(jsonRpcMessage));
  switch (parsedMessage.type) {
    case "notification":
    case "success":
      console.warn(`Received unexpected JSON-RPC message ${jsonRpcMessage}`);
      break;
    case "error":
      throw new Error("TODO: Respond with error message");
    case "request":
      yield handleMessage(parsedMessage.payload as RequestObject);
      break;
  }
}

function* handleMessage(payload: RequestObject) {
  const {id} = payload;

  switch (payload.method) {
    case "GetAddress":
      const address = yield select(getAddress);
      yield fork(messageSender, actions.addressResponse({id, address}));

      break;
    case "CreateChannel":
      yield handleCreateChannelMessage(payload);

      break;
    case "UpdateChannel":
      yield handleUpdateChannelMessage(payload);
  }
}

function* handleUpdateChannelMessage(payload: RequestObject) {
  const {id, params} = payload;
  const {channelId} = params as any;

  const channelExists = yield select(doesAStateExistForChannel, channelId);

  if (channelExists) {
    const mostRecentState: State = yield select(getLastStateForChannel, channelId);

    const newState = createStateFromUpdateChannelParams(mostRecentState, payload.params as any);

    yield put(
      actions.application.ownStateReceived({
        state: newState,
        processId: APPLICATION_PROCESS_ID
      })
    );

    yield fork(
      messageSender,
      actions.updateChannelResponse({
        id,
        state: newState
      })
    );
  } else {
    yield fork(messageSender, actions.unknownChannelId({id, channelId}));
  }
}

function* handleCreateChannelMessage(payload: RequestObject) {
  // TODO: We should verify the params we expect are there
  const {participants, appDefinition} = payload.params as any;
  const {id} = payload;

  const address = select(getAddress);
  const addressMatches = participants[0].signingAddress !== address;

  const provider = yield call(getProvider);
  const code = yield call(provider.getCode, appDefinition);
  const contractAtAddress = code.length > 2;

  if (!addressMatches) {
    yield fork(
      messageSender,
      actions.unknownSigningAddress({id, signingAddress: participants[0].signingAddress})
    );
  } else if (!contractAtAddress) {
    yield fork(messageSender, actions.noContractError({id, address: appDefinition}));
  } else {
    const state = createStateFromCreateChannelParams(payload.params as any);
    yield put(
      actions.protocol.initializeChannel({channelId: getChannelId(state.channel), participants})
    );
    yield put(
      actions.application.ownStateReceived({
        processId: APPLICATION_PROCESS_ID,
        state
      })
    );

    yield fork(
      messageSender,
      actions.createChannelResponse({
        id,
        channelId: getChannelId(state.channel)
      })
    );
  }
}
