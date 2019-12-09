import {call, fork, put, take, takeEvery, all} from 'redux-saga/effects';
import * as loginActions from './actions';
import {reduxSagaFirebase} from '../../gateways/firebase';
import metamaskSaga from '../metamask/saga';
// import {initializeWallet} from 'magmo-wallet-client'; TODO:WALLET_SCRUBBED_OUT eventually connect to the channelClient
// import {WALLET_IFRAME_ID} from '../../constants'; TODO:WALLET_SCRUBBED_OUT

function* loginSaga() {
  try {
    console.log(reduxSagaFirebase);
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
    const {user} = yield take(channel);
    if (user) {
      const libraryAddress = getLibraryAddress();
      if (!libraryAddress) {
        yield put(
          loginActions.loginFailure(
            `Could not find the deployed game library for the ${process.env.TARGET_NETWORK} network.`
          )
        );
      } else {
        yield put(loginActions.initializeWalletSuccess());
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
  ethereum.enable();
  yield fork(loginStatusWatcherSaga);
  yield all([
    takeEvery(loginActions.LOGIN_REQUEST, loginSaga),
    takeEvery(loginActions.LOGOUT_REQUEST, logoutSaga),
  ]);
}

function getLibraryAddress() {
  return process.env.RPS_CONTRACT_ADDRESS;
}
