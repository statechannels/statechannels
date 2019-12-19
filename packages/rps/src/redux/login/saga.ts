import {call, fork, put, take, takeEvery, all} from 'redux-saga/effects';
import * as loginActions from './actions';
import {reduxSagaFirebase} from '../../gateways/firebase';

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
        yield put(loginActions.loginSuccess(user, libraryAddress));
      }
    } else {
      yield put(loginActions.logoutSuccess());
    }
  }
}

export default function* loginRootSaga() {
  yield fork(loginStatusWatcherSaga);
  yield all([
    takeEvery(loginActions.LOGIN_REQUEST, loginSaga),
    takeEvery(loginActions.LOGOUT_REQUEST, logoutSaga),
  ]);
}

function getLibraryAddress() {
  return process.env.RPS_CONTRACT_ADDRESS;
}
