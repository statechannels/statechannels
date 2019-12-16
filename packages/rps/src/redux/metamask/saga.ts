import {call, put} from 'redux-saga/effects';
import * as metamaskActions from './actions';
import {MetamaskErrorType} from './actions';

interface NetworkNameToId {
  [name: string]: {networkId: number};
}
const networks: NetworkNameToId = {
  main: {
    networkId: 1,
  },
  ropsten: {
    networkId: 3,
  },
  rinkeby: {
    networkId: 4,
  },
  kovan: {
    networkId: 42,
  },
};

export default function* checkMetamask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      window.ethereum.autoRefreshOnNetworkChange = false;
      yield call([window.ethereum, 'enable']);
    } catch (error) {
      console.error(error);
      yield put(
        metamaskActions.metamaskErrorOccurred({
          errorType: MetamaskErrorType.MetamaskLocked,
        })
      );
      return false;
    }
    window.ethereum.on('networkChanged', function(networkId) {
      location.reload();
    });
    const targetNetworkName = process.env.TARGET_NETWORK;
    const selectedNetworkId = parseInt(window.ethereum.networkVersion, 10);
    console.log('selectedNetworkId' + selectedNetworkId);
    // Find the network name that matches the currently selected network id
    const selectedNetworkName =
      Object.keys(networks).find(
        networkName => networks[networkName].networkId === selectedNetworkId
      ) || 'development';

    if (!selectedNetworkId || targetNetworkName !== selectedNetworkName) {
      yield put(
        metamaskActions.metamaskErrorOccurred({
          errorType: MetamaskErrorType.WrongNetwork,
          networkName: process.env.TARGET_NETWORK,
        })
      );
      return false;
    }
    yield put(metamaskActions.metamaskSuccess());
    return true;
  } else {
    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.NoMetaMask,
      })
    );
    return false;
  }
}
