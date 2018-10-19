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
  yield fork(blockchainChallenge, simpleAdjudicator);

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

function* blockchainChallenge(simpleAdjudicator) {
  const channel = yield actionChannel([
    blockchainActions.FORCEMOVE_REQUEST,
    blockchainActions.RESPONDWITHMOVE_REQUEST,
    blockchainActions.RESPONDWITHALTERNATIVEMOVE_REQUEST,
    blockchainActions.REFUTE_REQUEST,
    blockchainActions.CONCLUDE_REQUEST,
  ]);
  while (true) {
    const action = yield take(channel);

    switch (action.type) {
      // TODO: handle errors
      case blockchainActions.FORCEMOVE_REQUEST:
        const { fromState, toState, v, r, s } = action.challengeProof;
        yield call(simpleAdjudicator.forceMove, fromState, toState, v, r, s);
        break;
      case blockchainActions.RESPONDWITHMOVE_REQUEST:
        const { positionData, signature } = action;
        yield call(simpleAdjudicator.respondWithMove, positionData, signature.v, signature.r, signature.s);
        break;
      case blockchainActions.RESPONDWITHALTERNATIVEMOVE_REQUEST:
        const { alternativePosition, alternativeSignature, response, responseSignature } = action;
        yield call(simpleAdjudicator.respondWithMove, alternativePosition, response,  [alternativeSignature.v, responseSignature.v], [alternativeSignature.r, responseSignature.r], [alternativeSignature.s, responseSignature.s]);
        break;
      case blockchainActions.REFUTE_REQUEST:
        const { positionData: refutation, signature: refutationSignature } = action;
        yield call(simpleAdjudicator.refute, refutation, refutationSignature.v, refutationSignature.r, refutationSignature.s);
        break;
      case blockchainActions.CONCLUDE_REQUEST:
        const { proof } = action;
        yield call(simpleAdjudicator.conclude, proof.fromState, proof.toState, [proof.fromSignature.v, proof.toSignature.v], [proof.fromSignature.r, proof.toSignature.r],[proof.fromSignature.s, proof.toSignature.s]);
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
        proof.fromState,
        proof.toState,
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
    } else if (result.event === "ChallengeCreated") {
      yield put(blockchainActions.challengeCreatedEvent({ ...result.args }));
    } else if (
      result.event === "RespondedWithMove" ||
      result.event === "Refuted" ||
      result.event === "RespondedWithAlternativeMove"
    ) {
      yield put(blockchainActions.challengeConcludedEvent({ ...result.args }));
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
