import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducers';
import rootSaga from './sagas';

const sagaMiddleware = createSagaMiddleware();

const enhancers = compose(
  applyMiddleware(sagaMiddleware),
  window.devToolsExtension ? window.devToolsExtension() : f => f,
);

const store = createStore(reducer, enhancers);

sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: object) => storeObj.game;
export const getWallet = (storeObj: object) => storeObj.wallet;
export const getUser = (storeObj: object) => storeObj.login.user;
