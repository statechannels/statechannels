import { take, put } from 'redux-saga/effects';
import * as incoming from 'magmo-wallet-client/lib/wallet-instructions';

import * as actions from '../actions';
import { eventChannel } from 'redux-saga';
import { WalletProcedure } from '../types';

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
          channelId,
          procedure: incomingProcedure,
        } = (action as incoming.ReceiveMessage).messagePayload;
        const procedure = convertToWalletProcedure(incomingProcedure);
        if ('commitment' in data) {
          yield put(
            actions.commitmentReceived(channelId, procedure, data.commitment, data.signature),
          );
        } else {
          yield put(actions.messageReceived(channelId, procedure, data));
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

const convertToWalletProcedure = (procedure: string) => {
  if (procedure === WalletProcedure.DirectFunding) {
    return WalletProcedure.DirectFunding;
  } else if (procedure === WalletProcedure.IndirectFunding) {
    return WalletProcedure.IndirectFunding;
  } else {
    throw new Error(`Could not convert ${procedure} to a valid wallet procedure`);
  }
};
