import { take, put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';
import { WalletProtocol } from '../types';

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
        const {
          data,
          processId,
          protocol: incomingprotocol,
        } = (action as incoming.ReceiveMessage).messagePayload;
        const protocol = convertToWalletprotocol(incomingprotocol);
        if ('commitment' in data) {
          yield put(
            actions.commitmentReceived(processId, protocol, data.commitment, data.signature),
          );
        } else {
          yield put(actions.messageReceived(processId, protocol, data));
        }
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

const convertToWalletprotocol = (protocol: string) => {
  if (protocol === WalletProtocol.DirectFunding) {
    return WalletProtocol.DirectFunding;
  } else if (protocol === WalletProtocol.IndirectFunding) {
    return WalletProtocol.IndirectFunding;
  } else {
    throw new Error(`Could not convert ${protocol} to a valid wallet protocol`);
  }
};
