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

export function* blockchainSaga() {
  const simpleAdjudicator = yield call(contractSetup);
  const watchAdjudicatorTask = yield fork(watchAdjudicator);
  yield fork(blockchainWithdrawal, simpleAdjudicator);

  yield take(blockchainActions.WITHDRAW_SUCCESS);
  yield cancel(watchAdjudicatorTask);

  return true;
}

function* contractSetup() {
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
    case blockchainActions.DEPLOY_REQUEST: // Player A
      try {
        const deployedContract = yield call(simpleAdjudicatorContract.new, [action.channelId], {
          value: action.amount.toString(),
        });

        yield put(blockchainActions.deploymentSuccess(deployedContract.address));
        // TODO: This should probably move out of this scope
        const listener = yield fork(listenForFundsReceivedEvents, deployedContract);
        yield take(blockchainActions.UNSUBSCRIBE_EVENTS);
        yield cancel(listener);

        return deployedContract;
      } catch (err) {
        yield handleError(blockchainActions.deploymentFailure, err);
      }

      break;
    case blockchainActions.DEPOSIT_REQUEST: // Player B
      try {
        const existingContract = yield call(simpleAdjudicatorContract.at, action.address);
        const transaction = yield call(existingContract.send, action.amount.toString());
        yield put(blockchainActions.depositSuccess(transaction));

        return existingContract;
      } catch (err) {
        yield handleError(blockchainActions.depositFailure, err);
      }
      break;
    }
  }
}

function* watchAdjudicator() {
  while (true) {
    yield take("Relevant blockchain events");
    // TODO: Respond accordingly
  }
}

function* blockchainWithdrawal(simpleAdjudicator) {
  while (true) {
    const action = yield take(blockchainActions.WITHDRAW_REQUEST);
    try {
      // TODO: ensure that someone has first called simpleAdudicator.conclude
      // This requires us to pass signed states.
      const transaction = yield simpleAdjudicator.withdraw(action.playerAddress);
      yield put(blockchainActions.withdrawSuccess(transaction));
      return true;
    } catch (err) {
      yield handleError(blockchainActions.withdrawFailure, err);
    }
  }
}

function handleError(action, err) {
  const message = err.message ? err.message : "Something went wrong";
  return put(action(message));
}
