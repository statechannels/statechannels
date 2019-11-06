import {take, put, select} from "redux-saga/effects";
import * as incoming from "../../magmo-wallet-client/wallet-instructions";

import * as actions from "../actions";
import {eventChannel, buffers} from "redux-saga";
import * as application from "../protocols/application/reducer";
import {isRelayableAction} from "../../communication";
import {responseProvided} from "../protocols/dispute/responder/actions";
import * as selectors from "../selectors";
import * as contractUtils from "../../utils/contract-utils";
import {concluded, challengeRequested} from "../protocols/application/actions";
import {CONSENSUS_LIBRARY_ADDRESS} from "../../constants";
import {State, getChannelId, SignedState} from "@statechannels/nitro-protocol";
import {decodeConsensusData} from "@statechannels/nitro-protocol/lib/src/contract/consensus-data";

export function* messageListener() {
  const postMessageEventChannel = eventChannel(emitter => {
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.data && event.data.type && event.data.type.indexOf("WALLET") > -1) {
        emitter(event);
      }
    });
    return () => {
      /* End channel here*/
    };
  }, buffers.fixed(100));
  while (true) {
    const messageEvent = yield take(postMessageEventChannel);
    const action = messageEvent.data;
    switch (messageEvent.data.type) {
      // Events that need a new process

      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.protocol.concludeRequested({channelId: action.channelId}));
        break;
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(
          challengeRequested({
            processId: application.APPLICATION_PROCESS_ID, // TODO allow for multiple application Ids
            state: action.state,
            channelId: action.channelId
          })
        );
        break;
      case incoming.FUNDING_REQUEST:
        yield put(
          actions.protocol.fundingRequested({
            channelId: action.channelId,
            playerIndex: action.playerIndex
          })
        );
        break;

      // Events that do not need a new process
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn({uid: action.userId}));
        break;
      case incoming.SIGN_STATE_REQUEST:
        if (action.state.turnNum === 0) {
          yield put(actions.protocol.initializeChannel({channelId: getChannelId(action.state.channel)}));
        }
        yield validateAgainstLatestState(action.state);

        yield put(
          actions.application.ownStateReceived({
            processId: application.APPLICATION_PROCESS_ID,
            state: action.state
          })
        );
        break;
      case incoming.VALIDATE_STATE_REQUEST:
        if (action.state.turnNum === 0) {
          yield put(actions.protocol.initializeChannel({channelId: getChannelId(action.state.channel)}));
        }
        yield validateAgainstLatestState(action.state);
        yield put(
          actions.application.opponentStateReceived({
            processId: application.APPLICATION_PROCESS_ID,
            signedState: {state: action.state, signature: action.signature}
          })
        );
        break;
      case incoming.RESPOND_TO_CHALLENGE:
        // TODO: This probably should be in a function
        const processId = application.APPLICATION_PROCESS_ID;
        yield put(responseProvided({processId, state: action.state}));
        break;
      case incoming.RECEIVE_MESSAGE:
        const messageAction = handleIncomingMessage(action);

        if (messageAction.type === "WALLET.COMMON.COMMITMENTS_RECEIVED") {
          yield validateTransitionForSignedStates(messageAction.signedStates);
        }

        yield put(messageAction);
        if (messageAction.type === "WALLET.NEW_PROCESS.CONCLUDE_INSTIGATED") {
          yield put(concluded({processId: application.APPLICATION_PROCESS_ID}));
        }
        break;
      default:
    }
  }
}

function* validateTransitionForSignedStates(signedStates: SignedState[]) {
  const channelId = getChannelId(signedStates[0].state.channel);

  const storedStateExists = yield select(selectors.doesAStateExistForChannel, channelId);
  if (storedStateExists) {
    const latestStoredCommitment: State = yield select(selectors.getLastStateForChannel, channelId);
    const newStates = signedStates.filter(signedState => signedState.state.turnNum > latestStoredCommitment.turnNum);
    if (newStates.length > 0) {
      let fromState = latestStoredCommitment;
      let toState = newStates[0].state;
      yield validateTransition(fromState, toState);

      for (let i = 1; i < signedStates.length; i++) {
        fromState = signedStates[i - 1].state;
        toState = signedStates[i].state;
        yield validateTransition(fromState, toState);
      }
    }
  }
}
function* validateAgainstLatestState(incomingState: State) {
  // If we're receiving the first state there's nothing stored to validate against
  if (incomingState.turnNum > 0) {
    const channelId = getChannelId(incomingState.channel);
    const fromState: State = yield select(selectors.getLastStateForChannel, channelId);
    yield validateTransition(fromState, incomingState);
  }
}

function* validateTransition(fromState: State, toState: State) {
  const privateKey = yield select(selectors.getPrivateKey);
  const validTransition = yield contractUtils.validateTransition(fromState, toState, privateKey);
  if (!validTransition) {
    const isConsensusChannel = toState.appDefinition === CONSENSUS_LIBRARY_ADDRESS;
    const fromAppData = isConsensusChannel ? decodeConsensusData(fromState.appData) : fromState.appData;
    const toAppData = isConsensusChannel ? decodeConsensusData(toState.appData) : toState.appData;
    throw new Error(
      `Invalid transition. From State: ${JSON.stringify(
        {
          ...fromState,
          appAttributes: fromAppData
        },
        null,
        1
      )} To State: ${JSON.stringify(
        {
          ...toState,
          appAttributes: toAppData
        },
        null,
        1
      )}`
    );
  }
}

function handleIncomingMessage(action: incoming.ReceiveMessage) {
  const data = action.messagePayload;

  if ("type" in data && isRelayableAction(data)) {
    return data;
  } else {
    throw new Error("Invalid action");
  }
}
