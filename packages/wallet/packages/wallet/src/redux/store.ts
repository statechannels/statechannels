import { applyMiddleware, compose, createStore } from 'redux';
import { fork } from 'redux-saga/effects';
import createSagaMiddleware from 'redux-saga';
const sagaMiddleware = createSagaMiddleware();

import { walletReducer } from './reducers';
import { sagaManager } from './sagas/saga-manager';

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware));

const store = createStore(walletReducer, enhancers);

function* rootSaga() {
  yield fork(sagaManager);
}

sagaMiddleware.run(rootSaga);

export default store;
export const getWalletState = (storeObj: any) => storeObj;
