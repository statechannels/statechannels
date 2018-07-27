import { call, put, take } from 'redux-saga/effects';

import { syncWallet } from '../actions/login';
import { default as firebase, reduxSagaFirebase } from '../../gateways/firebase';
import ChannelWallet from '../../game-engine/ChannelWallet';

export function* fetchOrCreateWallet(uid) {
  if (!uid) { return null; }

  let wallet = yield fetchWallet(uid);

  if (!wallet) {
    yield createWallet(uid);
    // fetch again instead of using return val, just in case another wallet was created in the interim
    wallet = yield fetchWallet(uid);
  }

  return wallet;
}

const walletTransformer = (data) => ({
  ...data.val(),
  id: data.key,
});

function* fetchWallet(uid) {
  const query = firebase.database().ref('wallets').orderByChild('uid').equalTo(uid).limitToFirst(1);

  // const wallet = yield call(reduxSagaFirebase.database.read, query);
  // ^ doesn't work as it returns an object like {-LIGGQQEI6OlWoveTPsq: {address: ... } }
  // which doesn't have any useful methods on for extracting the part we want
  // It seems like rsf.database.read doesn't really work when the result is a collection

  const result = yield call([query, query.once], 'value');
  let wallet;
  result.forEach((data) => { wallet = walletTransformer(data); }); // result should have size 1

  return wallet;
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

export function * walletWatcherSaga(wallet) {
  const channel = yield call(reduxSagaFirebase.database.channel, `wallets/${wallet.id}`);

  while (true) {
    const { updatedWallet } = yield take(channel);
    if (updatedWallet) {
      yield put(syncWallet(updatedWallet));
    } else { // someone has deleted the wallet remotely
      const recreatedWallet = yield fetchOrCreateWallet(wallet.uid);
      yield put(syncWallet(recreatedWallet));
    }
  }
}
