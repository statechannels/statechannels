import { take, put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';
import { unreachable } from '../../utils/reducer-utils';

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
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn(action.userId));
        break;
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(actions.channel.challengeRequested());
        break;
      case incoming.FUNDING_REQUEST:
        yield put(actions.channel.fundingRequested());
        break;
      case incoming.INITIALIZE_CHANNEL_REQUEST:
        yield put(actions.channel.channelInitialized());
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
      case incoming.RESPOND_TO_CHALLENGE:
        yield put(actions.channel.challengeCommitmentReceived(action.commitment));
        break;
      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.channel.concludeRequested());
        break;
      default:
    }
  }
}

function handleIncomingMessage(action: incoming.ReceiveMessage) {
  const { messagePayload } = action as incoming.ReceiveMessage;

  if ('processId' in messagePayload) {
    const { data, processId } = messagePayload;
    if ('commitment' in data) {
      return actions.commitmentReceived(processId, data.commitment, data.signature);
    } else {
      return actions.messageReceived(processId, data);
    }
  } else if ('protocol' in messagePayload) {
    throw new Error('Unexpected message');
  }
  return unreachable(messagePayload);
}
