import firebase from 'firebase';
import { call, fork, put, take, takeEvery, cancel } from 'redux-saga/effects';

import { LoginAction, LoginActionType } from '../actions/login';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { fetchOrCreatePlayer } from './player';
import applicationControllerSaga from './application-controller';
import { MessageAction } from '../actions/messages';
import { WalletActionType, WalletRetrievedAction } from '../../wallet';

const authProvider = new firebase.auth.GoogleAuthProvider();

function* loginSaga() {
  try {
    yield call(reduxSagaFirebase.auth.signInWithPopup, authProvider);
    // successful login will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(LoginAction.loginFailure(error));
  }
}

function* logoutSaga() {
  try {
    yield call(reduxSagaFirebase.auth.signOut);
    // successful logout will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(LoginAction.logoutFailure(error));
  }
}

function* loginStatusWatcherSaga() {
  yield take ('DRIZZLE_INITIALIZED');
  // Events on this channel are triggered on login and logout
  const channel = yield call(reduxSagaFirebase.auth.channel);
  // let playerHeartbeatThread;
  let applicationThread;

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      // login procedure
      yield put({ type: WalletActionType.WALLET_REQUESTED, uid: user.uid });
      const walletAction: WalletRetrievedAction = yield take(WalletActionType.WALLET_RETRIEVED);
      const { wallet } = walletAction;
      const player = yield fetchOrCreatePlayer(wallet.address, user.displayName);

      // playerHeartbeatThread = yield fork(playerHeartbeatSaga, wallet.address);
      yield put(MessageAction.subscribeMessages(wallet.address));
      applicationThread = yield fork(applicationControllerSaga, wallet);

      yield put(LoginAction.loginSuccess(user, wallet, player));
    } else {
      // Logout procedure
      // if (playerHeartbeatThread) { yield cancel(playerHeartbeatThread); }
      if (applicationThread) {
        yield cancel(applicationThread);
      }
      yield put(MessageAction.unsubscribeMessages());
      yield put(LoginAction.logoutSuccess());
    }
  }
}

export default function* loginRootSaga() {
  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(LoginActionType.LOGIN_REQUEST, loginSaga),
    takeEvery(LoginActionType.LOGOUT_REQUEST, logoutSaga),
  ];
}
