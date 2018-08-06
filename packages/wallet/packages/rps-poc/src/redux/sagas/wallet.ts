import { call } from 'redux-saga/effects';

import { default as firebase, reduxSagaFirebase } from '../../gateways/firebase';
import ChannelWallet from '../../game-engine/ChannelWallet';

export function* fetchOrCreateWallet(uid: string | undefined) {
  if (!uid) { return null; }

  let wallet = yield fetchWallet(uid);

  if (!wallet) {
    yield createWallet(uid);
    // fetch again instead of using return val, just in case another wallet was created in the interim
    wallet = yield fetchWallet(uid);
  }

  return wallet;
}

const walletTransformer = (data: object) => ({
  ...data.val(),
  id: data.key,
});

const walletRef = (uid) => {
  return firebase.database()
                 .ref('wallets')
                 .orderByChild('uid')
                 .equalTo(uid)
                 .limitToFirst(1);
}


function* fetchWallet(uid: string) {
  const query = walletRef(uid);

  // const wallet = yield call(reduxSagaFirebase.database.read, query);
  // ^ doesn't work as it returns an object like {-LIGGQQEI6OlWoveTPsq: {address: ... } }
  // which doesn't have any useful methods on for extracting the part we want
  // It seems like rsf.database.read doesn't really work when the result is a collection

  const result = yield call([query, query.once], 'value');
  let wallet;
  result.forEach((data) => { wallet = walletTransformer(data); }); // result should have size 1

  return wallet;
}

function* createWallet(uid: string) {
  const newWallet = new ChannelWallet();

  const walletParams = {
    uid: uid,
    privateKey: newWallet.privateKey,
    address: newWallet.address,
  }

  return yield call(reduxSagaFirebase.database.create, 'wallets', walletParams);
}
