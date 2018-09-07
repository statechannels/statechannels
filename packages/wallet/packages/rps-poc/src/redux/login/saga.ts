import firebase from 'firebase';
import { call, fork, put, take, takeEvery, cancel } from 'redux-saga/effects';

import * as loginActions from './actions';
import { reduxSagaFirebase } from '../../gateways/firebase';
import applicationSaga from '../application/saga';

const authProvider = new firebase.auth.GoogleAuthProvider();

function* loginSaga() {
  try {
    yield call(reduxSagaFirebase.auth.signInWithPopup, authProvider);
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
  // yield take ('DRIZZLE_INITIALIZED');
  // Events on this channel are triggered on login and logout
  const channel = yield call(reduxSagaFirebase.auth.channel);
  // let playerHeartbeatThread;
  let applicationThread;

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      applicationThread = yield fork(applicationSaga, user.uid);

      yield put(loginActions.loginSuccess(user));

    } else {
      if (applicationThread) {
        yield cancel(applicationThread);
      }
      yield put(loginActions.logoutSuccess());
    }
  }
}

export default function* loginRootSaga() {
  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(loginActions.LOGIN_REQUEST, loginSaga),
    takeEvery(loginActions.LOGOUT_REQUEST, logoutSaga),
  ];
}
