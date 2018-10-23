import { applyMiddleware, compose, createStore } from 'redux';
import { fork } from 'redux-saga/effects';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducer';
const sagaMiddleware = createSagaMiddleware();

import loginSaga from './login/saga';
import openGameSaga from './open-games/saga';
import messageSaga from './message-service/saga';

const composeEnhancers = (window as  any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancers = composeEnhancers(
  applyMiddleware(sagaMiddleware),
);

const store = createStore(reducer, enhancers);

function * rootSaga() {
  yield fork(loginSaga);
  yield fork(openGameSaga);
  yield fork(messageSaga);
}

sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: any) => storeObj.app;
export const getWalletState = (storeObj: any) => storeObj.wallet;
export const getUser = (storeObj: any) => storeObj.login.user;
export const getGameState = (storeObj:any)=>storeObj.game.gameState;
export const getGameStateName = (storeObj:any)=>storeObj.game.gameState.name;
export const getMessageState = (storeObj:any)=>storeObj.game.messageState;
