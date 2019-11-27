import { applyMiddleware, compose, createStore } from 'redux';
import { fork } from 'redux-saga/effects';
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

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware));

const store = createStore(reducer, enhancers);
const client = new RPSChannelClient();

function* rootSaga() {
  yield fork(loginSaga);
  yield fork(openGameSaga);
  yield fork(firebaseInboxListener, client);
  yield fork(channelUpdatedListener, client);
  yield fork(messageQueuedListener, client);
  yield fork(gameSaga, client);
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
