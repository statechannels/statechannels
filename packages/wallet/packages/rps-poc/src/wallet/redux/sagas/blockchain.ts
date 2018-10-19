import { take, put, actionChannel, call, fork, cancel, spawn } from 'redux-saga/effects';
// @ts-ignore
import simpleAdjudicatorArtifact from 'fmg-simple-adjudicator/contracts/SimpleAdjudicator.sol';
import { eventChannel } from 'redux-saga';

import { ConclusionProof } from '../../domain/ConclusionProof';
import * as blockchainActions from '../actions/blockchain';
import { deploySimpleAdjudicator, simpleAdjudicatorAt } from '../../../contracts/SimpleAdjudicator';

export function* blockchainSaga() {
  const { simpleAdjudicator, eventListener } = yield call(contractSetup);

  yield fork(blockchainWithdrawal, simpleAdjudicator);

  yield take(blockchainActions.WITHDRAW_SUCCESS);
  yield cancel(eventListener);

  return true;
}

function* contractSetup() {
  const channel = yield actionChannel([
    blockchainActions.DEPLOY_REQUEST,
    blockchainActions.DEPOSIT_REQUEST,
  ]);

  while (true) {
    const action = yield take(channel);

    switch (action.type) {
      case blockchainActions.DEPLOY_REQUEST: // Player A
        try {
          const { channelId, amount } = action;
          const deployedContract = yield call(deploySimpleAdjudicator, { channelId, amount });

          yield put(blockchainActions.deploymentSuccess(deployedContract.address));
          // TODO: This should probably move out of this scope
          const eventListener = yield spawn(watchAdjudicator, deployedContract);
          yield take(blockchainActions.FUNDSRECEIVED_EVENT);

          return { simpleAdjudicator: deployedContract, eventListener };
        } catch (err) {
          yield handleError(blockchainActions.deploymentFailure, err);
        }

        break;
      case blockchainActions.DEPOSIT_REQUEST: // Player B
        try {
          const { address, amount } = action;
          const existingContract = yield call(simpleAdjudicatorAt, { address, amount });
          const transaction = yield call(existingContract.send, action.amount.toString());
          yield put(blockchainActions.depositSuccess(transaction));
          const eventListener = yield spawn(watchAdjudicator, existingContract);

          return { simpleAdjudicator: existingContract, eventListener };
        } catch (err) {
          yield handleError(blockchainActions.depositFailure, err);
        }
        break;
    }
  }
}

function* blockchainWithdrawal(simpleAdjudicator) {
  while (true) {
    const action: blockchainActions.WithdrawRequest = yield take(blockchainActions.WITHDRAW_REQUEST);
    try {
      const proof: ConclusionProof = action.proof;
      const { playerAddress, destination, channelId, v, r, s } = action.withdrawData;

      const transaction = yield call(
        simpleAdjudicator.concludeAndWithdraw,
        proof.fromState.toHex(),
        proof.toState.toHex(),
        playerAddress,
        destination,
        channelId,
        [...proof.v, parseInt(v, 16)],
        [...proof.r, r],
        [...proof.s, s]
      );

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

function* watchAdjudicator(deployedContract) {
  const watchChannel = createEventChannel(deployedContract);
  while (true) {
    const result = yield take(watchChannel);

    if (result.event === "FundsReceived") {
      yield put(blockchainActions.fundsReceivedEvent({ ...result.args }));
    } else if (result.event === "GameConcluded") {
      yield put(blockchainActions.gameConcluded({ ...result.args }));
    }
  }
}

function createEventChannel(deployedContract) {
  const filter = deployedContract.allEvents();
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
