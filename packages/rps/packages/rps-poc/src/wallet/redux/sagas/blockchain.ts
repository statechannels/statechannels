import { take, put, actionChannel, call, fork, cancel, spawn } from 'redux-saga/effects';
import { ethers } from 'ethers';

import { ConclusionProof } from '../../domain/ConclusionProof';
import * as blockchainActions from '../actions/blockchain';
import * as externalActions from '../actions/external';
import { Signature } from '../../../wallet/domain';
import hash from 'object-hash';
import { SolidityType } from 'fmg-core';
import ChannelWallet from '../../../wallet/domain/ChannelWallet';
import { createFactory, depositFunds, deployContract } from '../../../contracts/simpleAdjudicatorUtils';
import { eventChannel } from 'redux-saga';

export function* blockchainSaga(wallet) {
  const { simpleAdjudicator, eventListener } = yield call(contractSetup);

  yield fork(blockchainConcludeAndWithdrawal, simpleAdjudicator);
  yield fork(blockchainChallenge, simpleAdjudicator, wallet);

  yield take(blockchainActions.CONCLUDEANDWITHDRAW_SUCCESS);
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
          const deployedContract = yield call(deployContract, channelId, amount);

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
          const factory = yield call(createFactory);
          const existingContract: ethers.Contract = factory.attach(address);
          const transaction = yield call(depositFunds, address, amount);
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

function* blockchainChallenge(simpleAdjudicator, wallet: ChannelWallet) {
  const channel = yield actionChannel([
    blockchainActions.FORCEMOVE_REQUEST,
    blockchainActions.RESPONDWITHMOVE_REQUEST,
    blockchainActions.RESPONDWITHALTERNATIVEMOVE_REQUEST,
    blockchainActions.REFUTE_REQUEST,
    blockchainActions.CONCLUDE_REQUEST,
    blockchainActions.WITHDRAW_REQUEST,
  ]);
  while (true) {
    const action = yield take(channel);

    switch (action.type) {
      case blockchainActions.WITHDRAW_REQUEST:
        const { address } = action;

        const data = [
          { type: SolidityType.address, value: address },
          { type: SolidityType.address, value: address },
          { type: SolidityType.bytes32, value: wallet.channelId },
        ];
        const requestId = hash(data.toString() + Date.now());

        yield put(externalActions.signatureRequest(requestId, data));
        const signAction: externalActions.SignatureSuccess = yield take(externalActions.SIGNATURE_SUCCESS);
        if (signAction.requestId === requestId) {
          const withdrawSignature = new Signature(signAction.signature);
          const transaction = yield call(simpleAdjudicator.withdraw, address, address, wallet.channelId, withdrawSignature.v, withdrawSignature.r, withdrawSignature.s);
          yield put(blockchainActions.withdrawSuccess(transaction));
        }

        break;
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
        yield call(simpleAdjudicator.respondWithMove, alternativePosition, response, [alternativeSignature.v, responseSignature.v], [alternativeSignature.r, responseSignature.r], [alternativeSignature.s, responseSignature.s]);
        break;
      case blockchainActions.REFUTE_REQUEST:
        const { positionData: refutation, signature: refutationSignature } = action;
        yield call(simpleAdjudicator.refute, refutation, refutationSignature.v, refutationSignature.r, refutationSignature.s);
        break;
      case blockchainActions.CONCLUDE_REQUEST:
        const { proof } = action;
        yield call(simpleAdjudicator.conclude, proof.fromState, proof.toState, [proof.fromSignature.v, proof.toSignature.v], [proof.fromSignature.r, proof.toSignature.r], [proof.fromSignature.s, proof.toSignature.s]);
        break;
    }
  }
}


function* blockchainConcludeAndWithdrawal(simpleAdjudicator) {
  while (true) {
    const action: blockchainActions.ConcludeAndWithdrawRequest = yield take(blockchainActions.CONCLUDEANDWITHDRAW_REQUEST);
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

      yield put(blockchainActions.concludeAndWithdrawSuccess(transaction));
      return true;
    } catch (err) {
      yield handleError(blockchainActions.concludeAndWithdrawFailure, err);
    }
  }
}

function handleError(action, err) {
  const message = err.message ? err.message : "Something went wrong";
  return put(action(message));
}

function convertBigNumberArgsToBN(argumentObject): any {
  const convertedObject = {};
  Object.keys(argumentObject).forEach(key => {
    if (argumentObject[key].constructor.name === 'BigNumber') {
      convertedObject[key] = argumentObject[key].toBn();
    } else {
      convertedObject[key] = argumentObject[key];
    }
  });
  return convertedObject;
}

function* watchAdjudicator(deployedContract: ethers.Contract) {
  const watchChannel = createEventChannel(deployedContract);
  while (true) {
    const result = yield take(watchChannel);
    const convertedArgs = convertBigNumberArgsToBN(result.args);
    if (result.event === "FundsReceived") {
      yield put(blockchainActions.fundsReceivedEvent({ ...convertedArgs }));
    } else if (result.event === "GameConcluded") {
      yield put(blockchainActions.gameConcluded({ ...convertedArgs }));
    } else if (result.event === "ChallengeCreated") {
      yield put(blockchainActions.challengeCreatedEvent({ ...convertedArgs }));
    } else if (
      result.event === "RespondedWithMove" ||
      result.event === "Refuted" ||
      result.event === "RespondedWithAlternativeMove"
    ) {
      yield put(blockchainActions.challengeConcludedEvent({ ...convertedArgs }));
    }
  }
}

function createEventChannel(deployedContract: ethers.Contract) {

  const channel = eventChannel(emitter => {
    deployedContract.on('*', (event) => {
      emitter(event);
    });
    return () => {
      deployedContract.stopWatching();
    };
  });
  return channel;
}
