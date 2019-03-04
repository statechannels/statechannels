import { take, put } from "redux-saga/effects";
import * as incoming from 'magmo-wallet-client/lib/messages-to-wallet';

import * as actions from "../actions";
import { eventChannel } from 'redux-saga';

export function* messageListener() {
  const postMessageEventChannel = eventChannel(emitter => {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.data && event.data.type && event.data.type.indexOf('WALLET') > -1) {
        emitter(event);
      }
    });
    return () => { /* End channel here*/ };
  });
  while (true) {
    const messageEvent = yield take(postMessageEventChannel);
    const action = messageEvent.data;
    switch (messageEvent.data.type) {
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(actions.challengeRequested());
        break;
      case incoming.FUNDING_REQUEST:
        yield put(actions.fundingRequested());
        break;
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn(action.userId));
        break;
      case incoming.SIGN_COMMITMENT_REQUEST:
        yield put(actions.ownCommitmentReceived(action.commitment));
        break;
      case incoming.VALIDATE_COMMITMENT_REQUEST:
        yield put(actions.opponentCommitmentReceived(action.commitment, action.signature));
        break;
      case incoming.RECEIVE_MESSAGE:
        yield put(actions.messageReceived(action.data, action.signature));
        break;
      case incoming.RESPOND_TO_CHALLENGE:
        yield put(actions.challengeCommitmentReceived(action.commitment));
        break;
      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.concludeRequested());
        break;
      default:
    }

  }

}



