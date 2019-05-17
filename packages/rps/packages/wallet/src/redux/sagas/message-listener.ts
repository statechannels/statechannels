import { take, put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';
import * as application from '../protocols/application/reducer';
import { isRelayableAction } from '../../communication';
import { getProcessId } from '../reducer';
import { responseProvided } from '../protocols/dispute/responder/actions';
import { WalletProtocol } from '../types';
import { getChannelId } from '../../domain';

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
      case incoming.INITIALIZE_CHANNEL_REQUEST:
        yield put(actions.protocol.initializeChannel());
        break;
      case incoming.CONCLUDE_CHANNEL_REQUEST:
        yield put(actions.protocol.concludeRequested(action.channelId));
        yield put(actions.application.concludeRequested(getProcessId(action)));
        break;
      case incoming.CREATE_CHALLENGE_REQUEST:
        yield put(actions.protocol.createChallengeRequested(action.channelId, action.commitment));
        break;
      case incoming.FUNDING_REQUEST:
        yield put(actions.protocol.fundingRequested(action.channelId, action.playerIndex));
        break;

      // Events that do not need a new process
      case incoming.INITIALIZE_REQUEST:
        yield put(actions.loggedIn(action.userId));
        break;
      case incoming.SIGN_COMMITMENT_REQUEST:
        yield put(
          actions.application.ownCommitmentReceived(
            application.APPLICATION_PROCESS_ID,
            action.commitment,
          ),
        );
        break;
      case incoming.VALIDATE_COMMITMENT_REQUEST:
        yield put(
          actions.application.opponentCommitmentReceived(
            application.APPLICATION_PROCESS_ID,
            action.commitment,
            action.signature,
          ),
        );
        break;
      case incoming.RESPOND_TO_CHALLENGE:
        // TODO: This probably should be in a function
        const channelId = getChannelId(action.commitment);
        const processId = `${WalletProtocol.Dispute}-${channelId}`;
        yield put(responseProvided(processId, action.commitment));
        break;
      case incoming.RECEIVE_MESSAGE:
        yield put(handleIncomingMessage(action));
        break;
      default:
    }
  }
}

function handleIncomingMessage(action: incoming.ReceiveMessage) {
  const data = action.messagePayload;

  if ('type' in data && isRelayableAction(data)) {
    return data;
  } else {
    throw new Error('Invalid action');
  }
}
