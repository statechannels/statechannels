import * as metamaskActions from './actions';
import { put, cps } from 'redux-saga/effects';
// @ts-ignore
import simpleAdjudicatorArtifact from 'fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol';
import { MetamaskErrorType } from './actions';

export default function* checkMetamask() {
  if (typeof web3 !== 'object' || web3 === null) {
    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.NoWeb3,
      }),
    );
    return false;
  }

  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  // For development networks we can have multiple networks defined so we have to check all of them
  if (!Object.keys(simpleAdjudicatorArtifact.networks).find(id=> parseInt(id,10) === selectedNetworkId)){
    // We just grab the first network from the contract. In dev all the multiple networks will be called 'development'
    // In non-dev environments there should only be only network 
    const targetNetworkId = parseInt(Object.keys(simpleAdjudicatorArtifact.networks)[0], 10);

    yield put(
      metamaskActions.metamaskErrorOccurred({
        errorType: MetamaskErrorType.WrongNetwork,
        networkId: targetNetworkId,
      }),
    );
    return false;
  }

  yield put(metamaskActions.metamaskSuccess());
  return true;
}
