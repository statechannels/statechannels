import {select, fork, put, putResolve, call} from "redux-saga/effects";
import {getChannelId, State} from "@statechannels/nitro-protocol";
import {
  JoinChannelParams,
  PushMessageParams,
  UpdateChannelParams,
  CreateChannelParams,
  CloseChannelParams,
  ChallengeChannelParams
} from "@statechannels/client-api-schema";
import jrs, {RequestObject} from "jsonrpc-lite";

import * as outgoingMessageActions from "./outgoing-api-actions";
import * as actions from "../../actions";
import {
  getAddress,
  getLastStateForChannel,
  doesAStateExistForChannel,
  getParticipants,
  getProtocolState
} from "../../selectors";
import {messageSender} from "./message-sender";
import {APPLICATION_PROCESS_ID} from "../../protocols/application/reducer";
import {
  createStateFromCreateChannelParams,
  createStateFromUpdateChannelParams
} from "../../../utils/json-rpc-utils";

import {getProvider} from "../../../utils/contract-utils";
import {AddressZero} from "ethers/constants";
import {validateRequest} from "../../../json-rpc-validation/validator";
import {fundingRequested} from "../../protocols/actions";
import {TwoPartyPlayerIndex} from "../../types";
import {isRelayableAction} from "../../../communication";
import {bigNumberify} from "ethers/utils";
import {Web3Provider} from "ethers/providers";
import {responseProvided} from "../../protocols/dispute/responder/actions";
import {isResponderState} from "../../protocols/dispute/responder/states";
import {ProtocolState} from "src/redux/protocols";

export function* messageHandler(jsonRpcMessage: object, _domain: string) {
  const parsedMessage = jrs.parseObject(jsonRpcMessage);
  switch (parsedMessage.type) {
    case "notification":
    case "success":
      console.warn(`Received unexpected JSON-RPC message ${JSON.stringify(jsonRpcMessage)}`);
      break;
    case "error":
      throw new Error("TODO: Respond with error message");
    case "request":
      const validationResult = yield validateRequest(jsonRpcMessage);
      if (!validationResult.isValid) {
        console.error(validationResult.errors);
        yield fork(
          messageSender,
          outgoingMessageActions.validationError({id: parsedMessage.payload.id})
        );
      }
      yield handleMessage(parsedMessage.payload as RequestObject);
      break;
  }
}

function* handleMessage(payload: RequestObject) {
  const {id} = payload;
  switch (payload.method) {
    case "GetAddress":
      const address = yield select(getAddress);
      yield fork(messageSender, outgoingMessageActions.addressResponse({id, address}));
      break;
    case "CreateChannel":
      yield handleCreateChannelMessage(payload);
      break;
    case "PushMessage":
      yield handlePushMessage(payload);
      break;
    case "UpdateChannel":
      yield handleUpdateChannelMessage(payload);
      break;
    case "JoinChannel":
      yield handleJoinChannelMessage(payload);
      break;
    case "CloseChannel":
      yield handleCloseChannelMessage(payload);
      break;
    case "ChallengeChannel":
      yield handleChallengeChannelMessage(payload);
      break;
    default:
      console.error(`No handler for method type ${payload.method}`);
      break;
  }
}

function* handleChallengeChannelMessage(payload: RequestObject) {
  const {id} = payload;
  const {channelId} = payload.params as ChallengeChannelParams;
  const channelExists = yield select(doesAStateExistForChannel, channelId);

  if (!channelExists) {
    yield fork(messageSender, outgoingMessageActions.unknownChannelId({id, channelId}));
  } else {
    const lastState: State = yield select(getLastStateForChannel, channelId);
    yield put(
      actions.application.challengeRequested({
        channelId,
        processId: "Application",
        state: lastState
      })
    );
    yield fork(messageSender, outgoingMessageActions.challengeChannelResponse({id, channelId}));
  }
}

function* handleCloseChannelMessage(payload: RequestObject) {
  const {id} = payload;
  const {channelId} = payload.params as CloseChannelParams;
  const channelExists = yield select(doesAStateExistForChannel, channelId);

  if (!channelExists) {
    yield fork(messageSender, outgoingMessageActions.unknownChannelId({id, channelId}));
  } else {
    yield put(actions.protocol.concludeRequested({channelId}));
    yield fork(messageSender, outgoingMessageActions.closeChannelResponse({id, channelId}));
  }
}

function* handleJoinChannelMessage(payload: RequestObject) {
  const {id} = payload;
  const {channelId} = payload.params as JoinChannelParams;

  const channelExists = yield select(doesAStateExistForChannel, channelId);

  if (!channelExists) {
    yield fork(messageSender, outgoingMessageActions.unknownChannelId({id, channelId}));
  } else {
    const lastState: State = yield select(getLastStateForChannel, channelId);

    const newState = {...lastState, turnNum: lastState.turnNum + 1};
    // We've already initialized the channel when we received the channel proposed message
    // So we can just sign our state
    yield put(
      actions.application.ownStateReceived({
        state: newState,
        processId: APPLICATION_PROCESS_ID
      })
    );
    yield put(fundingRequested({channelId, playerIndex: TwoPartyPlayerIndex.B}));
    yield fork(messageSender, outgoingMessageActions.joinChannelResponse({channelId, id}));

    yield fork(
      messageSender,
      outgoingMessageActions.sendChannelJoinedMessage({
        channelId,
        ...(yield getMessageParticipantIds(channelId))
      })
    );
  }
}

function* handlePushMessage(payload: RequestObject) {
  // TODO: We need to handle the case where we receive an invalid wallet message
  const {id} = payload;
  const message = payload.params as PushMessageParams;
  if (isRelayableAction(message.data)) {
    yield put(message.data);
    yield fork(messageSender, outgoingMessageActions.pushMessageResponse({id}));
  } else {
    switch (message.data.type) {
      case "Channel.Updated":
        yield put(
          actions.application.opponentStateReceived({
            processId: APPLICATION_PROCESS_ID,
            signedState: message.data.signedState
          })
        );
        yield fork(messageSender, outgoingMessageActions.pushMessageResponse({id}));

        yield fork(
          messageSender,
          outgoingMessageActions.channelUpdatedEvent({
            channelId: getChannelId(message.data.signedState.state.channel)
          })
        );

        break;
      case "Channel.Joined":
        yield put(
          actions.application.opponentStateReceived({
            processId: APPLICATION_PROCESS_ID,
            signedState: message.data.signedState
          })
        );

        yield put(
          fundingRequested({
            channelId: getChannelId(message.data.signedState.state.channel),
            playerIndex: TwoPartyPlayerIndex.A
          })
        );
        yield fork(
          messageSender,
          outgoingMessageActions.channelUpdatedEvent({
            channelId: getChannelId(message.data.signedState.state.channel)
          })
        );
        yield fork(messageSender, outgoingMessageActions.pushMessageResponse({id}));
        break;
      case "Channel.Open":
        const {signedState, participants} = message.data;
        // The channel gets initialized and the state will be pushed into the app protocol
        // If the client doesn't want to join the channel then we dispose of these on that API call
        // Since only our wallet can progress the app protocol from this point by signing the next state
        // we're safe to initialize the channel before the client has called JoinChannel
        // The only limitation is that our client cannot propose a new channel with the same channelId
        // before they decline the opponent's proposed channel
        const provider: Web3Provider = yield call(getProvider);

        if (!bigNumberify(signedState.state.appDefinition).isZero()) {
          const bytecode = yield call(
            [provider, provider.getCode],
            signedState.state.appDefinition
          );

          yield put(
            actions.appDefinitionBytecodeReceived({
              appDefinition: signedState.state.appDefinition,
              bytecode
            })
          );
        }

        yield put(
          actions.protocol.initializeChannel({
            channelId: getChannelId(signedState.state.channel),
            participants
          })
        );

        yield put(
          actions.application.opponentStateReceived({
            processId: APPLICATION_PROCESS_ID,
            signedState
          })
        );

        yield fork(messageSender, outgoingMessageActions.pushMessageResponse({id}));

        const channelId = getChannelId(signedState.state.channel);
        yield fork(
          messageSender,
          outgoingMessageActions.channelProposedEvent({
            channelId
          })
        );
        break;
      default:
        console.error(`Could not handle message data with type ${message.data.type}`);
    }
  }
}

function* handleUpdateChannelMessage(payload: RequestObject) {
  const {id, params} = payload;
  const {channelId} = params as UpdateChannelParams;

  const channelExists = yield select(doesAStateExistForChannel, channelId);

  if (!channelExists) {
    yield fork(messageSender, outgoingMessageActions.unknownChannelId({id, channelId}));
  } else {
    const mostRecentState: State = yield select(getLastStateForChannel, channelId);

    const newState = createStateFromUpdateChannelParams(
      mostRecentState,
      params as UpdateChannelParams
    );

    // TODO: This only works with one channel at a time
    const protocolState: ProtocolState = yield select(getProtocolState, "Application");

    if (
      protocolState &&
      protocolState.type === "Application.WaitForDispute" &&
      typeof protocolState.disputeState !== "undefined" &&
      isResponderState(protocolState.disputeState)
    ) {
      yield putResolve(
        responseProvided({
          processId: "Application",
          state: newState
        })
      );
    } else {
      // NOTE: We only call ownStateReceived if _not_ in dispute because this action
      // has a reducer which returns the protocol state to Application.Ongoing, but we
      // want it to stay as Application.WaitForDispute
      yield putResolve(
        actions.application.ownStateReceived({
          state: newState,
          processId: APPLICATION_PROCESS_ID
        })
      );

      yield fork(
        messageSender,
        outgoingMessageActions.sendChannelUpdatedMessage({
          channelId,
          ...(yield getMessageParticipantIds(channelId))
        })
      );
    }

    yield fork(messageSender, outgoingMessageActions.updateChannelResponse({id, channelId}));
  }
}

function* handleCreateChannelMessage(payload: RequestObject) {
  // TODO: We should verify the params we expect are there
  const {participants, appDefinition} = payload.params as CreateChannelParams;
  const {id} = payload;

  const address = yield select(getAddress);
  const addressMatches = participants[0].signingAddress === address;

  const provider = yield call(getProvider);

  const bytecode =
    appDefinition !== AddressZero ? yield call([provider, provider.getCode], appDefinition) : "0x0";
  const contractAtAddress = bytecode.length > 2;

  if (!addressMatches) {
    yield fork(
      messageSender,
      outgoingMessageActions.unknownSigningAddress({
        id,
        signingAddress: participants[0].signingAddress
      })
    );
  } else if (!contractAtAddress) {
    yield fork(messageSender, outgoingMessageActions.noContractError({id, address: appDefinition}));
  } else {
    const state = createStateFromCreateChannelParams(payload.params as CreateChannelParams);

    yield put(
      actions.appDefinitionBytecodeReceived({
        appDefinition,
        bytecode
      })
    );

    yield put(
      actions.protocol.initializeChannel({
        channelId: getChannelId(state.channel),
        participants
      })
    );

    yield put(
      actions.application.ownStateReceived({
        processId: APPLICATION_PROCESS_ID,
        state
      })
    );

    yield fork(
      messageSender,
      outgoingMessageActions.createChannelResponse({
        id,
        channelId: getChannelId(state.channel)
      })
    );

    yield fork(
      messageSender,
      outgoingMessageActions.sendChannelProposedMessage({
        toParticipantId: participants[1].participantId,
        fromParticipantId: participants[0].participantId,
        channelId: getChannelId(state.channel)
      })
    );
  }
}

function* getMessageParticipantIds(channelId: string) {
  const address = yield select(getAddress);
  const participants = yield select(getParticipants, channelId);
  // We assume a two player channel
  const {participantId: fromParticipantId} =
    participants[0].signingAddress === address ? participants[0] : participants[1];
  const {participantId: toParticipantId} =
    participants[0].signingAddress !== address ? participants[0] : participants[1];
  return {fromParticipantId, toParticipantId};
}
