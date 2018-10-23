import { fork, take, call, put, select, actionChannel } from 'redux-saga/effects';
import { buffers } from 'redux-saga';
import hash from 'object-hash';

import { reduxSagaFirebase } from '../../gateways/firebase';
import { actions as walletActions } from '../../wallet';
import { SignatureSuccess } from '../../wallet/redux/actions/external';
import * as challengeActions from '../../wallet/redux/actions/challenge';
import { encode, decode, Player, positions } from '../../core';
import * as gameActions from '../game/actions';
import { MessageState } from './state';
import * as gameStates from '../game/state';
import { Channel, State } from 'fmg-core';
import { getMessageState, getGameState } from '../store';

export enum Queue {
  WALLET = 'WALLET',
  GAME_ENGINE = 'GAME_ENGINE',
}

export const getWalletAddress = (storeObj:any) => storeObj.wallet.address;

export default function* messageSaga() {
  yield fork(waitForWalletThenReceiveFromFirebaseSaga);
  yield fork(receiveFromWalletSaga);
  yield fork(sendMessagesSaga);
  yield fork(sendWalletMessageSaga);
}

export function* sendWalletMessageSaga() {
  while (true) {
    const action = yield take(walletActions.SEND_MESSAGE);
    const queue = Queue.WALLET;
    const { data, to } = action;
    const message = { data, queue };
    yield call(reduxSagaFirebase.database.create, `/messages/${to.toLowerCase()}`, message);
  }
}

export function* sendMessagesSaga() {
  // We need to use an actionChannel to queue up actions that
  // might be put from this saga
  const channel = yield actionChannel([
    gameActions.CHOOSE_MOVE,
    gameActions.CONFIRM_GAME,
    gameActions.CREATE_OPEN_GAME,
    gameActions.INITIAL_POSITION_RECEIVED,
    gameActions.PLAY_AGAIN,
    gameActions.POSITION_RECEIVED,
    gameActions.FUNDING_SUCCESS,
    gameActions.WITHDRAWAL_SUCCESS,
    gameActions.JOIN_OPEN_GAME,
    gameActions.RESIGN,
  ]);
  while (true) {
    // We take any action that might trigger the outbox to be updated
    yield take(channel);

    const messageState: MessageState = yield select(getMessageState);
    if (messageState.opponentOutbox) {
      const queue = Queue.GAME_ENGINE;
      const data = encode(messageState.opponentOutbox.position);
      const signature = yield signMessage(data);
      const message = { data, queue, signature };
      const { opponentAddress } = messageState.opponentOutbox;
      yield put(walletActions.messageSent(data, signature));
      // tslint:disable-next-line:no-console
      console.log('[MESSAGE_SERVICE] sending to firebase', opponentAddress, message);
      yield call(reduxSagaFirebase.database.create, `/messages/${opponentAddress.toLowerCase()}`, message);
      // tslint:disable-next-line:no-console
      console.log('[MESSAGE_SERVICE] sent to firebase');
      yield put(gameActions.messageSent());
    }
    if (messageState.walletOutbox) {
      const gameState: gameStates.GameState = yield select(getGameState);
      if (
        gameState.name !== gameStates.StateName.Lobby &&
        gameState.name !== gameStates.StateName.WaitingRoom &&
        gameState.name !== gameStates.StateName.CreatingOpenGame
      ) {
        yield handleWalletMessage(messageState.walletOutbox, gameState);
      }
    }
   
  }
}

function * waitForWalletThenReceiveFromFirebaseSaga() {
  while(true) {
    yield take('*');

    const address = yield select(getWalletAddress);

    if (address) {
      // this will never return
      yield receiveFromFirebaseSaga(address);
    }
  }
}

function* receiveFromFirebaseSaga(address) {
  address = address.toLowerCase();

  // tslint:disable-next-line:no-console
  console.log('[MESSAGE SAGA] monitoring firebase');

  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address}`,
    'child_added',
    buffers.fixed(10),
  );

  while (true) {
    const message = yield take(channel);
    // tslint:disable-next-line:no-console
    console.log('[MESSAGE SAGA] message received');
    const key = message.snapshot.key;

    const { data, queue } = message.value;

    if (queue === Queue.GAME_ENGINE) {
      const { signature } = message.value;
      const validMessage = yield validateMessage(data, signature);
      if (!validMessage) {
        // TODO: Handle this
      }
      yield put(walletActions.messageReceived(data, signature));
      const position = decode(data);
      if (position.name === positions.PRE_FUND_SETUP_A) {
        // todo: how do we get actual names in here - will need to look up from firebase
        yield put(gameActions.initialPositionReceived(position, 'Me', 'Opponent'));
      } else {
        yield put(gameActions.positionReceived(position));
      }
    } else {
      yield put(walletActions.receiveMessage(data));
    }
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}
function* handleWalletMessage(type, state: gameStates.PlayingState) {
  const { libraryAddress, channelNonce, player, balances, participants } = state;
  const channel = new Channel(libraryAddress, channelNonce, participants);
  const channelId = channel.id;

  switch (type) {
    case "FUNDING_REQUESTED":
      // TODO: We need to close the channel at some point
      yield put(walletActions.openChannelRequest(channel));
      const myIndex = player === Player.PlayerA ? 0 : 1;

      const opponentAddress = participants[1 - myIndex];
      const myAddress = participants[myIndex];
      const myBalance = balances[myIndex];
      const opponentBalance = balances[1 - myIndex];

      yield put(walletActions.fundingRequest(channelId, myAddress, opponentAddress, myBalance, opponentBalance, myIndex));
      yield take(walletActions.FUNDING_SUCCESS);
      yield put(gameActions.messageSent());
      yield put(gameActions.fundingSuccess());

      break;
    case "WITHDRAWAL_REQUESTED":
      const { turnNum } = positions.conclude(state);
      const channelState = new State({
        channel,
        stateType: State.StateType.Conclude,
        turnNum,
        resolution: balances,
        stateCount: 0,
      });
      yield put(walletActions.withdrawalRequest(channelState));
      yield take(walletActions.WITHDRAWAL_SUCCESS);
      yield put(gameActions.messageSent());
      yield put(gameActions.withdrawalSuccess());

  }
}

function* receiveFromWalletSaga() {
  while (true) {
    const { position } = yield take(challengeActions.SEND_CHALLENGE_POSITION);
    yield put(gameActions.positionReceived(position));
  }
}

function* validateMessage(data, signature) {
  const requestId = hash(data + Date.now());
  yield put(walletActions.validationRequest(requestId, data, signature));
  const actionFilter = [walletActions.VALIDATION_SUCCESS, walletActions.VALIDATION_FAILURE];
  let action: walletActions.ValidationResponse = yield take(actionFilter);
  while (action.requestId !== requestId) {
    action = yield take(actionFilter);
  }
  if (action.type === walletActions.VALIDATION_SUCCESS) {
    return true;
  } else {
    // TODO: Properly handle this.
    throw new Error("Signature Validation error");
  }
}

function* signMessage(data) {
  const requestId = hash(data + Date.now());

  yield put(walletActions.signatureRequest(requestId, data));
  // TODO: Handle signature failure
  const actionFilter = walletActions.SIGNATURE_SUCCESS;
  let signatureResponse: SignatureSuccess = yield take(actionFilter);
  while (signatureResponse.requestId !== requestId) {
    signatureResponse = yield take(actionFilter);
  }
  return signatureResponse.signature;
}
