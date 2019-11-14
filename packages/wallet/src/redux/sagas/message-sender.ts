import {OutgoingJsonRpcAction} from "../actions";

import {call, select} from "redux-saga/effects";
import {getChannelStatus} from "../state";
import {ChannelState, getLastState} from "../channel-store";
import {createJsonRpcAllocationsFromOutcome} from "../../utils/json-rpc-utils";
import jrs from "jsonrpc-lite";
import {unreachable} from "../../utils/reducer-utils";

import {Outcome} from "@statechannels/nitro-protocol";

export function* messageSender(action: OutgoingJsonRpcAction) {
  const message = yield createResponseMessage(action);
  yield call(window.parent.postMessage, JSON.stringify(message), "*");
}

function* createResponseMessage(action: OutgoingJsonRpcAction) {
  switch (action.type) {
    case "WALLET.CREATE_CHANNEL_RESPONSE":
      const channelInfo = yield getChannelInfo(action.channelId);
      return jrs.success(action.id, {...channelInfo});
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

      const state = getLastState(channelStatus);
      // TODO: We'll need to store and manage request ids
      const request: Request = {
        type: "Channel.Open",
        requestID: "TODO",
        appData: state.appData,
        appDefinition: state.appDefinition,
        outcome: state.outcome,
        participants: state.channel.participants
      };
      return jrs.notification("MessageQueued", {
        recipient: action.fromParticipantId,
        sender: action.toParticipantId,
        data: request,
        signedStates: channelStatus.signedStates
      });
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

// TODO: Move this to a better location once we've finalized the messages

interface OpenChannel {
  type: "Channel.Open";
  appDefinition: string;
  appData: string;
  outcome: Outcome;
  participants: string[];
}
type Request = {requestID: string} & OpenChannel;
