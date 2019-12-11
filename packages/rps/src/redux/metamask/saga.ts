import * as metamaskActions from './actions';
import {put, cps, delay} from 'redux-saga/effects';
import {MetamaskErrorType} from './actions';

export default function* checkMetamask() {
  if (typeof web3 !== 'object' || web3 === null) {
    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.NoWeb3,
      })
    );
    return false;
  }

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

  try {
    const targetNetworkName = process.env.TARGET_NETWORK;

    // Find the network name that matches the currently selected network id
    const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
    // Find the network name that matches the currently selected network id
    const selectedNetworkName =
      Object.keys(networks).find(
        networkName => networks[networkName].network_id === selectedNetworkId
      ) || 'development';

    if (targetNetworkName !== selectedNetworkName) {
      yield put(
        metamaskActions.metamaskErrorOccurred({
          errorType: MetamaskErrorType.WrongNetwork,
          networkName: process.env.TARGET_NETWORK,
        })
      );
      return false;
    }
    let accountUnlocked = false;
    while (!accountUnlocked) {
      const accounts = yield cps(web3.eth.getAccounts);
      accountUnlocked = accounts && accounts.length > 0;
      if (!accountUnlocked) {
        yield put(
          metamaskActions.metamaskErrorOccurred({
            errorType: MetamaskErrorType.MetamaskLocked,
          })
        );
      } else {
        delay(1000);
      }
    }
    yield put(metamaskActions.metamaskSuccess());
    return true;
  } catch {
    yield put(metamaskActions.metamaskErrorOccurred({errorType: MetamaskErrorType.UnknownError}));
  }
  return false;
}
