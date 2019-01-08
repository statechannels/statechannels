import { call, select, put } from 'redux-saga/effects';

import { default as firebase, reduxSagaFirebase } from '../../../gateways/firebase';
import ChannelWallet from '../../domain/ChannelWallet';
import { SiteState } from '../../../redux/reducer';
import { keysLoaded } from '../actions';
import { getProvider } from '../../utils/contract-utils';
import { ethers } from 'ethers';


interface WalletParams {
  uid: string;
  privateKey: string;
  address: string;
}

export function* keyLoader() {
  const uid = yield select((state: SiteState) => state.login.user.uid);

  let wallet = yield* fetchWallet(uid);

  if (!wallet) {
    yield* createWallet(uid);
    // fetch again instead of using return val, just in case another wallet was created in the interim
    wallet = yield* fetchWallet(uid);
  }
  // TODO: This should probably be its own saga? or at least its
  const provider: ethers.providers.BaseProvider = yield call(getProvider);
  const network = yield provider.getNetwork();
  yield put(keysLoaded(wallet.address, wallet.privateKey, network.chainId));
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

  return new ChannelWallet(wallet.privateKey, wallet.id);
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
