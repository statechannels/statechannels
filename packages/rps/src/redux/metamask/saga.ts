import {cps, delay, put} from 'redux-saga/effects';
import * as metamaskActions from './actions';
import {MetamaskErrorType} from './actions';

export default function* checkMetamask() {
  const networks = {
    development: {
      networkId: '*', // match any network
    },
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

  if (typeof window.ethereum !== 'undefined') {
    try {
      yield window.ethereum.enable();
      yield put(metamaskActions.metamaskSuccess());
      return true;
    } catch (error) {
      yield put(
        metamaskActions.metamaskErrorOccurred({
          errorType: MetamaskErrorType.MetamaskLocked,
        })
      );
    }
  } else {
    delay(500);
  }

  try {
    const targetNetworkName = process.env.TARGET_NETWORK;
    const selectedNetworkId = parseInt(yield cps(window.ethereum.networkVersion), 10);
    // Find the network name that matches the currently selected network id
    const selectedNetworkName = Object.keys(networks).find(
      networkName => networks[networkName].network_id === selectedNetworkId
    );

    if (targetNetworkName !== selectedNetworkName) {
      yield put(
        metamaskActions.metamaskErrorOccurred({
          errorType: MetamaskErrorType.WrongNetwork,
          networkName: process.env.TARGET_NETWORK,
        })
      );
      return false;
    }
  } catch (e) {
    yield put(metamaskActions.metamaskErrorOccurred({errorType: MetamaskErrorType.UnknownError}));
  }
  return false;
}
