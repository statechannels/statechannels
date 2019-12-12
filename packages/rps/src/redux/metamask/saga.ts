import {cps, delay, put} from 'redux-saga/effects';
import * as metamaskActions from './actions';
import {MetamaskErrorType} from './actions';

export default function* checkMetamask() {
  if (typeof window.web3 !== 'object' || window.web3 === null) {
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
    const selectedNetworkId = parseInt(yield cps(window.web3.version.getNetwork), 10);
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

    if (window.ethereum) {
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
      let accountUnlocked = false;
      while (!accountUnlocked) {
        const accounts = yield cps(window.web3.eth.getAccounts);
        accountUnlocked = accounts && accounts.length > 0;
        if (!accountUnlocked) {
          yield put(metamaskActions.metamaskSuccess());
        } else {
          delay(1000);
        }
      }
    }
  } catch (e) {
    yield put(metamaskActions.metamaskErrorOccurred({errorType: MetamaskErrorType.UnknownError}));
  }
  return false;
}
