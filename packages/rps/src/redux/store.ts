import { applyMiddleware, compose, createStore } from 'redux';
import { fork, call } from 'redux-saga/effects';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducer';
const sagaMiddleware = createSagaMiddleware();

import loginSaga from './login/saga';
import openGameSaga from './open-games/saga';
import { firebaseInboxListener } from './message-service/firebase-inbox-listener';
import { RPSChannelClient } from '../utils/rps-channel-client';
import { channelUpdatedListener } from './message-service/channel-updated-listener';
import { messageQueuedListener } from './message-service/message-queued-listener';
import { gameSaga } from './game/saga';
import { autoPlayer, autoOpponent } from './auto-opponent';

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware));

const store = createStore(reducer, enhancers);
const client = new RPSChannelClient();

function* rootSaga() {
  yield call([client, client.enable]);

  console.log('Client enabled');
  yield fork(loginSaga);
  yield fork(channelUpdatedListener, client);
  yield fork(messageQueuedListener, client);
  yield fork(gameSaga, client);

  if (process.env.AUTO_PLAYER === 'A') {
    yield fork(autoPlayer, 'A');
  } else if (process.env.AUTO_PLAYER === 'B') {
    yield fork(autoPlayer, 'B');
  }

  if (process.env.AUTO_OPPONENT === 'A') {
    yield fork(autoOpponent, 'A', client);
  } else if (process.env.AUTO_OPPONENT === 'B') {
    yield fork(autoOpponent, 'B', client);
  } else {
    yield fork(firebaseInboxListener, client);
    yield fork(openGameSaga);
  }
}

sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: any) => storeObj.app;
export const getWalletState = (storeObj: any) => storeObj.wallet;
export const getUser = (storeObj: any) => storeObj.login.user;
export const getProfile = (storeObj: any) => storeObj.login.profile;
export const getGameState = (storeObj: any) => storeObj.game.gameState;
export const getGameStateName = (storeObj: any) => storeObj.game.gameState.name;
export const getMessageState = (storeObj: any) => storeObj.game.messageState;
