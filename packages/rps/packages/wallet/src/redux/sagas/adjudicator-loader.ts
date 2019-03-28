import { call, put, select } from 'redux-saga/effects';

import * as actions from '../actions';
import { getProvider, getAdjudicatorContractAddress } from '../../utils/contract-utils';
import { ethers } from 'ethers';
import { WalletState, WAIT_FOR_ADJUDICATOR } from '../state';

export function* adjudicatorLoader() {
  const state: WalletState = yield select((walletState: WalletState) => walletState);
  if (state.type !== WAIT_FOR_ADJUDICATOR) {
    return;
  }
  if (typeof web3 === 'undefined') {
    yield put(actions.metamaskLoadError());
  } else {
    const provider: ethers.providers.BaseProvider = yield call(getProvider);
    const network = yield provider.getNetwork();
    const adjudicator = yield getAdjudicatorContractAddress(provider);
    yield put(actions.adjudicatorKnown(network.chainId, adjudicator));
  }
}
