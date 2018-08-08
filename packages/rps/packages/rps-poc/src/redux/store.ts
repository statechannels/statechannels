import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducers';
import rootSaga from './sagas';

const sagaMiddleware = createSagaMiddleware();

const enhancers = compose(
  applyMiddleware(sagaMiddleware),
  (<any>window).devToolsExtension ? (<any>window).devToolsExtension() : f => f,
);

const store = createStore(reducer, enhancers);

sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: any) => storeObj.game;
export const getWallet = (storeObj: any) => storeObj.wallet;
export const getUser = (storeObj: any) => storeObj.login.user;
