import firebase from 'firebase';
import { call, fork, put, take, takeEvery, cancel, race } from 'redux-saga/effects';
import { delay } from 'redux-saga'

import { LoginAction, LoginActionType } from '../actions/login';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { fetchOrCreatePlayer } from './player';
import applicationControllerSaga from './application-controller';
import { MessageAction } from '../actions/messages';
import { walletSaga, actions as walletActions } from '../../wallet';

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
  // yield take ('DRIZZLE_INITIALIZED');
  // Events on this channel are triggered on login and logout
  const channel = yield call(reduxSagaFirebase.auth.channel);
  // let playerHeartbeatThread;
  let applicationThread;

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      // login procedure
      yield fork(walletSaga, user.uid);

      const { success, failure } = yield race({
        success: take(walletActions.INITIALIZATION_SUCCESS),
        failure: call(delay, 2000),
      });

      if (failure) { throw new Error('Wallet initialization timed out'); }

      const address = (success as walletActions.InitializationSuccess).address;

      const player = yield fetchOrCreatePlayer(address, user.displayName);

      yield put(MessageAction.subscribeMessages(address));

      applicationThread = yield fork(applicationControllerSaga, address);

      yield put(LoginAction.loginSuccess(user, player));

    } else {
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
