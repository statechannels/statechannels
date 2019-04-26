import { take, put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';

export function* messageListener() {
  const postMessageEventChannel = eventChannel(emitter => {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data && event.data.type && event.data.type.indexOf('WALLET') > -1) {
        emitter(event);
      }
    });
    return () => {
      /* End channel here*/
    };
  });
  while (true) {
    const messageEvent = yield take(postMessageEventChannel);
    const action = messageEvent.data;
    switch (messageEvent.data.type) {
      // Events that need a new process
      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.protocol.concludeRequested(action.channelId));
        break;
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(actions.protocol.createChallengeRequested(action.channelId));
        break;
      case incoming.FUNDING_REQUEST:
        yield put(actions.protocol.fundingRequested(action.channelId, action.playerIndex));
        break;
      case incoming.RESPOND_TO_CHALLENGE:
        yield put(actions.protocol.respondToChallengeRequested(action.commitment));
        break;

      // Events that do not need a new process
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn(action.userId));
        break;
      case incoming.INITIALIZE_CHANNEL_REQUEST:
        // todo: what do we need to do here?
        break;
      case incoming.SIGN_COMMITMENT_REQUEST:
        yield put(actions.channel.ownCommitmentReceived(action.commitment));
        break;
      case incoming.VALIDATE_COMMITMENT_REQUEST:
        yield put(actions.channel.opponentCommitmentReceived(action.commitment, action.signature));
        break;
      case incoming.RECEIVE_MESSAGE:
        yield put(handleIncomingMessage(action));
        break;
      default:
    }
  }
}

function handleIncomingMessage(action: incoming.ReceiveMessage) {
  const { messagePayload } = action as incoming.ReceiveMessage;

  const { data, processId } = messagePayload;

  if ('commitment' in data) {
    return actions.commitmentReceived(processId, data.commitment, data.signature);
  } else if ('type' in data) {
    // TODO: It would be nice if eventually every message simply wrapped an action
    return data;
  } else {
    return actions.messageReceived(processId, data);
  }
}
