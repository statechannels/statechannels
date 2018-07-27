import firebase from 'firebase';
import { call, fork, put, take, takeEvery, select, cancel } from 'redux-saga/effects';

import {
  types,
  loginFailure,
  logoutFailure,
  syncUser,
  syncUserDetails,
} from '../actions/login';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { fetchOrCreateWallet, walletWatcherSaga } from './wallet';
import { getUser } from '../store';

const authProvider = new firebase.auth.GoogleAuthProvider();

function * loginSaga () {
  try {
    const data = yield call(reduxSagaFirebase.auth.signInWithPopup, authProvider);
    console.log('login data', data);
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
  const channel = yield call(reduxSagaFirebase.auth.channel);
  let watchers = {};

  while (true) {
    const { user } = yield take(channel);
    const currentUser = yield select(getUser);

    if (!user) {
      yield logoutProcedure(watchers);
    } else if (!currentUser) {
      watchers = yield loginProcedure(user);
    } else if (currentUser.uid != user.uid) {
      yield logoutProcedure(watchers);
      watchers = yield loginProcedure(user);
    } else {
      yield put(syncUser(user));
    }
  }
}

function * logoutProcedure({ walletWatcher }) {
  if (walletWatcher) { yield cancel(walletWatcher) };
  yield put(syncUserDetails(null, null));
}

function * loginProcedure(user) {
  const wallet = yield fetchOrCreateWallet(user.uid);

  yield put(syncUserDetails(user, wallet));

  const walletWatcher = yield fork(walletWatcherSaga, wallet);
  return { walletWatcher };
}

export default function * loginRootSaga () {
  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(types.LOGIN.REQUEST, loginSaga),
    takeEvery(types.LOGOUT.REQUEST, logoutSaga)
  ];
}
