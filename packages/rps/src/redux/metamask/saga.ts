import {put, take, fork} from 'redux-saga/effects';
import * as metamaskActions from './actions';
import {eventChannel} from 'redux-saga';

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
  }
}

export default function* metamaskSaga() {
  if (window.ethereum) {
    window.ethereum.autoRefreshOnNetworkChange = false;
    yield put(metamaskActions.networkChanged(window.ethereum.networkVersion));
    yield fork(networkChangedSaga);
  }
}
