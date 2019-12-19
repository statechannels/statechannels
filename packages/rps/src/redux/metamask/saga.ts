import {call, put, take, fork} from 'redux-saga/effects';
import * as metamaskActions from './actions';
import {eventChannel} from 'redux-saga';

function* enableSaga() {
  while (true) {
    yield take('UpdateProfile');
    yield put(metamaskActions.enable());
    yield call([window.ethereum, 'enable']);
  }
}

function* networkChangedSaga() {
  const networkChangedChannel = eventChannel(emit => {
    window.ethereum.on('networkChanged', function(networkId) {
      emit(networkId);
    });
    return () => {
      /* */
    };
  });
  while (true) {
    const network = yield take(networkChangedChannel);
    yield put(metamaskActions.networkChanged(network));
    location.reload();
  }
}

function* accountsChangedSaga() {
  const accountsChangedChannel = eventChannel(emit => {
    window.ethereum.on('accountsChanged', function(accounts) {
      emit(accounts);
    });
    return () => {
      /* */
    };
  });
  while (true) {
    const accounts = yield take(accountsChangedChannel);
    yield put(metamaskActions.accountsChanged(accounts));
  }
}

export default function* metamaskSaga() {
  if (window.ethereum) {
    window.ethereum.autoRefreshOnNetworkChange = false;
    yield put(metamaskActions.networkChanged(window.ethereum.networkVersion));
    yield put(metamaskActions.accountsChanged([window.ethereum.selectedAddress]));
    yield fork(accountsChangedSaga);
    yield fork(networkChangedSaga);
    yield fork(enableSaga);
  }
}
