import { initDrizzle } from '../blockchain/drizzle';
import { applyMiddleware, compose, createStore } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { generateContractsInitialState } from 'drizzle';

import RockPaperScissorsGame from '../contracts/RockPaperScissorsGame.json'
import State from '../contracts/State.json';
import Rules from '../contracts/Rules.json';
import reducer from './reducers';
import rootSaga from './sagas';


const sagaMiddleware = createSagaMiddleware();

const enhancers = compose(
  applyMiddleware(sagaMiddleware),
  (window as any).devToolsExtension ? (window as any).devToolsExtension() : f => f,
);

const drizzleOptions = {
  contracts: [RockPaperScissorsGame,State,Rules],
};
const initialState = {
  contracts: generateContractsInitialState(drizzleOptions),
};

const store = createStore(reducer, initialState, enhancers); 
initDrizzle(store,drizzleOptions);
sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: any) => storeObj.game;
export const getWalletState = (storeObj: any) => storeObj.wallet;
export const getUser = (storeObj: any) => storeObj.login.user;
