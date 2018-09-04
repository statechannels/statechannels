import * as blockchainActions from '../actions/blockchain';
import { take, put, actionChannel, call } from 'redux-saga/effects';
// @ts-ignore
import simpleAdjudicatorArtifact from 'fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol';
import contract from 'truffle-contract';
import detectNetwork from 'web3-detect-network';
// The blockchain saga will be responsible for dealing with the blockchain using truffle
export function* blockchainSaga() {
  const channel = yield actionChannel(
    a =>
      a.type === blockchainActions.DEPLOY_REQUEST ||
      a.type === blockchainActions.DEPOSIT_REQUEST,
  );
  while (true) {
    const action = yield take(channel);
    const network = yield call(detectNetwork, web3.currentProvider);
    const simpleAdjudicatorContract = contract(simpleAdjudicatorArtifact);
    yield call (simpleAdjudicatorContract.defaults,{from:web3.eth.defaultAccount})
    if (!Object.keys(simpleAdjudicatorContract.networks).find(id => id === network.id)) {
      yield put(blockchainActions.wrongNetwork(network.id));
      continue;
    }

    simpleAdjudicatorContract.setProvider(web3.currentProvider);
    simpleAdjudicatorContract.setNetwork(network.id);

    switch (action.type) {
      case blockchainActions.DEPLOY_REQUEST:
        try {
          const deployedContract = yield call(simpleAdjudicatorContract.new, [action.channelId]);
          yield put(blockchainActions.deploymentSuccess(deployedContract.address));
        } catch (err) {
          yield put(blockchainActions.deploymentFailure(err));
        }
        break;
      case blockchainActions.DEPOSIT_REQUEST:
        try {
          const existingContract = yield call(simpleAdjudicatorContract.at, action.address);
          // TODO: Use correct amount
          const transaction = yield call(existingContract.send, web3.toWei(action.amount, "ether"));
          yield put(blockchainActions.depositSuccess(transaction));
          break;
        } catch (err) {
          yield put(blockchainActions.depositFailure(err));
        }
    }
  }
}
