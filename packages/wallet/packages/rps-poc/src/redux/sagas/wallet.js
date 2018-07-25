import { call, put, takeEvery, select } from 'redux-saga/effects';

import { types as loginActions } from '../actions/login';
import { syncWallet } from '../actions/wallet';
import { default as firebase, reduxSagaFirebase } from '../../gateways/firebase';
import ChannelWallet from '../../game-engine/ChannelWallet';

import { getUser } from '../store';

function* fetchOrCreateWalletSaga() {
  const user = yield select(getUser);

  if (!user) {
    yield put(syncWallet(null));
    return;
  }

  let wallet = yield fetchWallet(user.uid);

  if (!wallet) {
    yield createWallet(user.uid);
    // fetch again instead of using return val, just in case another wallet was created in the interim
    wallet = yield fetchWallet(user.uid);
  }

  yield put(syncWallet(wallet));
}

function* fetchWallet(uid) {
  const query = firebase.database().ref('wallets').orderByChild('uid').equalTo(uid).limitToFirst(1);
  return yield call(reduxSagaFirebase.database.read, query);
}

function* createWallet(uid) {
  const newWallet = new ChannelWallet();

  const walletParams = {
    uid: uid,
    privateKey: newWallet.privateKey,
    address: newWallet.address,
  }

  return yield call(reduxSagaFirebase.database.create, 'wallets', walletParams);
}

export default function* walletRootSaga() {
  yield takeEvery(loginActions.SYNC_USER, fetchOrCreateWalletSaga);
}
