import * as metamaskActions from './actions';
import { put, cps } from 'redux-saga/effects';
import truffle from 'truffle.js';
import { MetamaskErrorType } from './actions';
import { delay } from 'redux-saga';

export default function* checkMetamask() {
  if (typeof web3 !== 'object' || web3 === null) {
    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.NoWeb3,
      }),
    );
    return false;
  }


  const targetNetworkName = process.env.TARGET_NETWORK;
  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  // Find the network name that matches the currently selected network id
  const selectedNetworkName = Object.keys(truffle.networks).find(networkName =>
    truffle.networks[networkName].network_id === selectedNetworkId) || "development";

  if (targetNetworkName !== selectedNetworkName) {
    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.WrongNetwork,
        networkName: process.env.TARGET_NETWORK,
      }),
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
        }));
    } else {
      delay(1000);
    }
  }
  yield put(metamaskActions.metamaskSuccess());
  return true;
}
