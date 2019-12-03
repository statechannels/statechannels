import * as metamaskActions from './actions';
import { put, cps, delay } from 'redux-saga/effects';
import { MetamaskErrorType } from './actions';

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
      network_id: '*', // match any network
    },
    main: {
      network_id: 1,
    },
    ropsten: {
      network_id: 3,
    },
    rinkeby: {
      network_id: 4,
    },
    kovan: {
      network_id: 42,
    },
  };

  try {
    const targetNetworkName = process.env.TARGET_NETWORK;
    ethereum.enable();

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
    yield put(metamaskActions.metamaskErrorOccurred({ errorType: MetamaskErrorType.UnknownError }));
  }
  return false;
}
