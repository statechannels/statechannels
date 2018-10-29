import { call, fork, put, take, takeEvery, cancel, cps, select } from 'redux-saga/effects';

import * as loginActions from './actions';
import { reduxSagaFirebase } from '../../gateways/firebase';
import { walletSaga } from '../../wallet';
import metamaskSaga from '../metamask/saga';

// @ts-ignore
import RPSGameArtifact from '../../../contracts/RockPaperScissorsGame.sol';

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
  let applicationThread;

  while (true) {
    const { user } = yield take(channel);

    if (user) {
      applicationThread = yield fork(walletSaga, user.uid);
      const libraryAddress = yield getLibraryAddress();
      yield put(loginActions.loginSuccess(user, libraryAddress));

    } else {
      if (applicationThread) {
        yield cancel(applicationThread);
      }
      yield put(loginActions.logoutSuccess());
    }
  }
}

export default function* loginRootSaga() {
  const metaMask = yield metamaskSaga();
  
  // If metamask is not properly set up we can halt processing and wait for the reload
  if (!metaMask){
    return;
  }

  yield fork(loginStatusWatcherSaga);
  yield [
    takeEvery(loginActions.LOGIN_REQUEST, loginSaga),
    takeEvery(loginActions.LOGOUT_REQUEST, logoutSaga),
    takeEvery(loginActions.UPDATE_PROFILE, syncProfileSaga),
  ];
}

function* getLibraryAddress() {
  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  return RPSGameArtifact.networks[selectedNetworkId].address;
}

// put these here instead of importing from store to avoid cyclic references
// todo: do this better
const getUid = (storeObj: any) => storeObj.login.user.uid;
const getProfile = (storeObj: any) => storeObj.login.profile;

function * syncProfileSaga() {
  const uid = yield select(getUid);
  const profile = yield select(getProfile);

  yield call(reduxSagaFirebase.database.update, `/profiles/${uid}`, profile);
}
