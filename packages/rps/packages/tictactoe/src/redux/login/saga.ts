import { call, fork, put, take, takeEvery, cps } from 'redux-saga/effects';

import * as loginActions from './actions';
import { reduxSagaFirebase } from '../../gateways/firebase';
import metamaskSaga from '../metamask/saga';
import { initializeWallet } from 'magmo-wallet-client';
import TTTGameArtifact from '../../../build/contracts/TicTacToeGame.json';
import { WALLET_IFRAME_ID } from '../../constants';

function* loginSaga() {
  try {
    yield call(reduxSagaFirebase.auth.signInAnonymously);
    // successful login will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(loginActions.loginFailure(error));
  }
}

function* logoutSaga() {
  try {
    yield call(reduxSagaFirebase.auth.signOut);
    // successful logout will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(loginActions.logoutFailure(error));
  }
}

function* loginStatusWatcherSaga() {

  // Events on this channel are triggered on login and logout
  const channel = yield call(reduxSagaFirebase.auth.channel);
  // let playerHeartbeatThread;

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      const libraryAddress = yield getLibraryAddress();
      if (!libraryAddress) {
        yield put(loginActions.loginFailure(`Could not find the deployed game library for the ${process.env.TARGET_NETWORK} network.`));
      } else {
        const walletAddress = yield initializeWallet(WALLET_IFRAME_ID, user.uid);
        yield put(loginActions.initializeWalletSuccess(walletAddress));
        yield put(loginActions.loginSuccess(user, libraryAddress));
      }


    } else {
      yield put(loginActions.logoutSuccess());
    }
  }
}

export default function* loginRootSaga() {
  yield take(loginActions.WALLET_IFRAME_LOADED);
  const metaMask = yield metamaskSaga();

  // If metamask is not properly set up we can halt processing and wait for the reload
  if (!metaMask) {
    return;
  }

  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(loginActions.LOGIN_REQUEST, loginSaga),
    takeEvery(loginActions.LOGOUT_REQUEST, logoutSaga),
  ];
}

function* getLibraryAddress() {
  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  if (!TTTGameArtifact.networks || !TTTGameArtifact.networks[selectedNetworkId]) {
    return undefined;
  }
  return TTTGameArtifact.networks[selectedNetworkId].address;
}

