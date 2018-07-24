import firebase from 'firebase';
import { call, fork, put, take, takeEvery } from 'redux-saga/effects';

import {
  types,
  loginSuccess,
  loginFailure,
  logoutSuccess,
  logoutFailure,
  syncUser
} from '../actions/login';
import { reduxSagaFirebase } from '../../gateways/firebase';


const authProvider = new firebase.auth.GoogleAuthProvider();

function * loginSaga () {
  try {
    const data = yield call(reduxSagaFirebase.auth.signInWithPopup, authProvider);
    yield put(loginSuccess(data));
  } catch (error) {
    yield put(loginFailure(error));
  }
}

function * logoutSaga () {
  try {
    const data = yield call(reduxSagaFirebase.auth.signOut);
    yield put(logoutSuccess(data));
  } catch (error) {
    yield put(logoutFailure(error));
  }
}

function * syncUserSaga () {
  const channel = yield call(reduxSagaFirebase.auth.channel);

  while (true) {
    const { user } = yield take(channel);

    if (user) yield put(syncUser(user));
    else yield put(syncUser(null));
  }
}

export default function * loginRootSaga () {
  yield fork(syncUserSaga);
  yield [
    takeEvery(types.LOGIN.REQUEST, loginSaga),
    takeEvery(types.LOGOUT.REQUEST, logoutSaga)
  ];
}