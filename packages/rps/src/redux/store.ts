import {applyMiddleware, compose, createStore} from 'redux';
import {fork, take} from 'redux-saga/effects';
import createSagaMiddleware from 'redux-saga';

import reducer from './reducer';
const sagaMiddleware = createSagaMiddleware();
import stateChannelWalletSaga from './wallet/saga';

import metamaskSaga from './metamask/saga';
import openGameSaga from './open-games/saga';
import {setupFirebase} from './message-service/setup-firebase-messaging';
import {RPSChannelClient} from '../utils/rps-channel-client';
import {channelUpdatedListener} from './message-service/channel-updated-listener';
import {gameSaga} from './game/saga';
import {autoPlayer, autoOpponent} from './auto-opponent';
import {ChannelClient, FakeChannelProvider} from '@statechannels/channel-client';
import {GotAddressFromWallet} from './game/actions';
// import {HUB, tenEth} from '../constants';

const composeEnhancers = (window as any).__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const enhancers = composeEnhancers(applyMiddleware(sagaMiddleware));

const store = createStore(reducer, enhancers);

function* rootSaga() {
  yield fork(metamaskSaga);

  let client: RPSChannelClient;
  if (process.env.AUTO_OPPONENT === 'A' || process.env.AUTO_OPPONENT === 'B') {
    console.info('Bypassing state channel wallet');
    client = new RPSChannelClient(new ChannelClient(new FakeChannelProvider()));
  } else {
    client = new RPSChannelClient(new ChannelClient(window.channelProvider));
    yield stateChannelWalletSaga();
  }

  yield fork(channelUpdatedListener, client);

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
    setupFirebase(client, window.channelProvider.signingAddress);

    // RPS only supports a directly funded channel, for now
    // yield call(
    //   [client, 'approveBudgetAndFund'],
    //   tenEth,
    //   tenEth,
    //   window.channelProvider.destinationAddress,
    //   HUB.signingAddress,
    //   HUB.outcomeAddress
    // );

    const action: GotAddressFromWallet = yield take('GotAddressFromWallet');
    yield fork(openGameSaga, action.address);
  }
}

sagaMiddleware.run(rootSaga);

export default store;

export const getApplicationState = (storeObj: any) => storeObj.app;
export const getWalletState = (storeObj: any) => storeObj.wallet;
export const getUser = (storeObj: any) => storeObj.login.user;
export const getProfile = (storeObj: any) => storeObj.login.profile;
export const getGameState = (storeObj: any) => storeObj.game.gameState;
export const getLocalState = (storeObj: any) => storeObj.game.gameState;
export const getGameStateName = (storeObj: any) => storeObj.game.gameState.name;
export const getMessageState = (storeObj: any) => storeObj.game.messageState;
