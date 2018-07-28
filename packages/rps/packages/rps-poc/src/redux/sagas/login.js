import firebase from 'firebase';
import { call, fork, put, take, takeEvery, select, cancel } from 'redux-saga/effects';

import {
  types,
  loginFailure,
  loginSuccess,
  logoutFailure,
  logoutSuccess,
} from '../actions/login';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { fetchOrCreateWallet, walletWatcherSaga } from './wallet';

const authProvider = new firebase.auth.GoogleAuthProvider();

function * loginSaga () {
  try {
    yield call(reduxSagaFirebase.auth.signInWithPopup, authProvider);
    // successful login will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(loginFailure(error));
  }
}

function * logoutSaga () {
  try {
    yield call(reduxSagaFirebase.auth.signOut);
    // successful logout will trigger the loginStatusWatcher, which will update the state
  } catch (error) {
    yield put(logoutFailure(error));
  }
}

function * loginStatusWatcherSaga () {
  // Events on this channel are triggered on login and logout
  const channel = yield call(reduxSagaFirebase.auth.channel);

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      // login procedure
      const wallet = yield fetchOrCreateWallet(user.uid);
      yield put(loginSuccess(user, wallet));
    } else {
      // Logout procedure
      yield put(logoutSuccess());
    }
  }
}

export default function * loginRootSaga () {
  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(types.LOGIN.REQUEST, loginSaga),
    takeEvery(types.LOGOUT.REQUEST, logoutSaga)
  ];
}
