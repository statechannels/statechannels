import * as blockchainActions from '../actions/blockchain';
import { take, put, actionChannel, call, fork, cancel } from 'redux-saga/effects';
// @ts-ignore
import simpleAdjudicatorArtifact from 'fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol';
import contract from 'truffle-contract';
import detectNetwork from 'web3-detect-network';
import { eventChannel } from 'redux-saga';

function* listenForFundsReceivedEvents(deployedContract) {
  const watchChannel = createEventChannel(deployedContract);
  while (true) {
    const result = yield take(watchChannel);
    yield put(blockchainActions.fundsReceivedEvent({ ...result.args }));
  }
}

function createEventChannel(deployedContract) {
  const filter = deployedContract.FundsReceived();
  const channel = eventChannel(emitter => {
    filter.watch((error, results) => {
      if (error) {
        throw error;
      }
      emitter(results);
    });
    return () => {
      filter.stopWatching();
    };
  });
  return channel;
}

// The blockchain saga will be responsible for dealing with the blockchain using truffle
export function* blockchainSaga() {
  const channel = yield actionChannel([
    blockchainActions.DEPLOY_REQUEST,
    blockchainActions.DEPOSIT_REQUEST,
  ]);

  const network = yield call(detectNetwork, web3.currentProvider);
  const simpleAdjudicatorContract = contract(simpleAdjudicatorArtifact);
  yield call(simpleAdjudicatorContract.defaults, { from: web3.eth.defaultAccount });
  simpleAdjudicatorContract.setProvider(web3.currentProvider);
  simpleAdjudicatorContract.setNetwork(network.id);

  while (true) {
    const action = yield take(channel);

    switch (action.type) {
      case blockchainActions.DEPLOY_REQUEST:
        try {
          const deployedContract = yield call(simpleAdjudicatorContract.new, [action.channelId], {
            value: action.amount.toString(),
          });

          yield put(blockchainActions.deploymentSuccess(deployedContract.address));
          // TODO: This should probably move out of this scope
          const listener = yield fork(listenForFundsReceivedEvents, deployedContract);
          yield take(blockchainActions.UNSUBSCRIBE_EVENTS);
          yield cancel(listener);
        } catch (err) {
          const message = err.message ? err.message : "Something went wrong";
          yield put(blockchainActions.deploymentFailure(message));
        }

        break;
      case blockchainActions.DEPOSIT_REQUEST:
        try {
          const existingContract = yield call(simpleAdjudicatorContract.at, action.address);
          const transaction = yield call(existingContract.send, action.amount.toString());
          yield put(blockchainActions.depositSuccess(transaction));
        } catch (err) {
          const message = err.message ? err.message : "Something went wrong";
          yield put(blockchainActions.depositFailure(message));
        }
        break;
    }
  }
}
