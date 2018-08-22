import { call, put, take } from 'redux-saga/effects';

import { default as firebase, reduxSagaFirebase } from '../../gateways/firebase';
import ChannelWallet from '../domain/ChannelWallet';
import { WalletAction, WalletActionType } from '..';

interface WalletParams {
  uid: string;
  privateKey: string;
  address: string;
}

export function* walletSaga(): IterableIterator<any> {
  while (true) {
    const action = yield take(WalletActionType.WALLET_REQUESTED);
    const { uid } = action;
    let wallet = yield* fetchWallet(uid);

    if (!wallet) {
      yield* createWallet(uid);
      // fetch again instead of using return val, just in case another wallet was created in the interim
      wallet = yield* fetchWallet(uid);
    }

    yield put(WalletAction.walletRetrieved(wallet));
  }
}

const walletTransformer = (data: any) =>
  ({
    ...data.val(),
    id: data.key,
  } as WalletParams);

const walletRef = uid => {
  return firebase
    .database()
    .ref('wallets')
    .orderByChild('uid')
    .equalTo(uid)
    .limitToFirst(1);
};

function* fetchWallet(uid: string) {
  const query = walletRef(uid);

  // const wallet = yield call(reduxSagaFirebase.database.read, query);
  // ^ doesn't work as it returns an object like {-LIGGQQEI6OlWoveTPsq: {address: ... } }
  // which doesn't have any useful methods on for extracting the part we want
  // It seems like rsf.database.read doesn't really work when the result is a collection

  const result = yield call([query, query.once], 'value');
  if (!result.exists()) {
    return null;
  }
  let wallet;
  result.forEach(data => {
    wallet = walletTransformer(data);
  }); // result should have size 1

  return new ChannelWallet(wallet.privateKey);
}

function* createWallet(uid: string) {
  const newWallet = new ChannelWallet();

  const walletParams = {
    uid,
    privateKey: newWallet.privateKey,
    address: newWallet.address,
  };

  return yield call(reduxSagaFirebase.database.create, 'wallets', walletParams);
}
