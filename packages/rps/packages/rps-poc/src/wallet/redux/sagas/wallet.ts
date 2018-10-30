import { actionChannel, take, put, fork, call, cancel, race, } from 'redux-saga/effects';
import { State, SolidityType, decodeSignature } from 'fmg-core';

import { AUTO_OPPONENT_ADDRESS } from '../../../constants';
import { default as firebase } from '../../../gateways/firebase';

import ChannelWallet, { SignableData } from '../../domain/ChannelWallet';
import { ConclusionProof } from '../../domain/ConclusionProof';
import decode from '../../domain/decode';
import WalletEngine from '../../wallet-engine/WalletEngine';

import * as actions from '../actions/external';
import * as blockchainActions from '../actions/blockchain';
import * as stateActions from '../actions/state';
import * as playerActions from '../actions/player';
import * as displayActions from '../actions/display';
import * as challengeActions from '../actions/challenge';

import { initializeWallet } from './initialization';
import { fundingSaga } from './funding';
import { blockchainSaga } from './blockchain';
import { ChallengeProof } from '../../domain/ChallengeProof';
import challengeSaga from './challenge';
import { messageListenerSaga } from './messaging';
import { ChallengeStatus } from '../../domain/ChallengeStatus';

export function* walletSaga(uid: string): IterableIterator<any> {
  const wallet = (yield initializeWallet(uid)) as ChannelWallet;
  const walletEngine = new WalletEngine();

  yield put(actions.initializationSuccess(wallet.address));
  yield fork(messageListenerSaga, wallet);
  yield fork(handleRequests, wallet, walletEngine);
}

function* handleRequests(wallet: ChannelWallet, walletEngine: WalletEngine) {
  let runningBlockchainSaga = null;
  let runningEventListener = null;
  const channel = yield actionChannel([
    actions.FUNDING_REQUEST,
    actions.SIGNATURE_REQUEST,
    actions.VALIDATION_REQUEST,
    actions.WITHDRAWAL_REQUEST,
    actions.OPEN_CHANNEL_REQUEST,
    actions.CLOSE_CHANNEL_REQUEST,
    actions.CREATE_CHALLENGE_REQUEST,
    actions.CHALLENGE_RESPONSE_REQUEST,
  ]);
  while (true) {
    const action: actions.RequestAction = yield take(channel);

    // The handlers below will block, so the wallet will only ever
    // process one action at a time from the queue.
    switch (action.type) {
      case actions.OPEN_CHANNEL_REQUEST:
        runningBlockchainSaga = yield fork(blockchainSaga, wallet);
        runningEventListener = yield fork(blockchainEventListener, wallet);
        yield wallet.openChannel(action.channel);
        yield put(actions.channelOpened(wallet.channelId));
        break;

      case actions.CLOSE_CHANNEL_REQUEST:
        if (runningBlockchainSaga != null) {
          yield cancel(runningBlockchainSaga);
        }
        if (runningEventListener != null) {
          yield cancel(runningEventListener);
        }
        yield wallet.closeChannel();
        yield put(actions.channelClosed(wallet.id));
        break;

      case actions.SIGNATURE_REQUEST:
        yield handleSignatureRequest(wallet, action.requestId, action.data);
        break;
      case actions.VALIDATION_REQUEST:
        yield handleValidationRequest(
          wallet,
          action.requestId,
          action.data,
          action.signature,
        );
        break;

      case actions.FUNDING_REQUEST:

        walletEngine.setup(action);
        // Save the initial state
        yield put(stateActions.stateChanged(walletEngine.state));
        yield fork(handleFundingRequest, wallet, walletEngine, action.playerIndex);
        break;

      case actions.WITHDRAWAL_REQUEST:
        const { position } = action;
        yield handleWithdrawalRequest(wallet, walletEngine, position);
        break;
      case actions.CREATE_CHALLENGE_REQUEST:
        yield handleChallengeRequest(wallet, walletEngine);
        break;
      default:
        // @ts-ignore
        const _exhaustiveCheck: never = action;
    }
  }
}

function* handleChallengeRequest(wallet: ChannelWallet, walletEngine: WalletEngine) {
  yield put(challengeActions.setChallengeStatus(ChallengeStatus.WaitingForCreateChallenge));
  yield put(displayActions.showWallet());

  const challengeProof = yield loadChallengeProof(wallet, wallet.channelId);
  yield put(blockchainActions.forceMove(challengeProof));
}

function* handleSignatureRequest(
  wallet: ChannelWallet,
  requestId: string,
  data: SignableData
) {
  // TODO: Validate transition
  const signature: string = wallet.sign(data);
  yield put(actions.signatureSuccess(requestId, signature));
}

function* handleValidationRequest(
  wallet: ChannelWallet,
  requestId,
  data: SignableData,
  signature: string,
) {
  const address = wallet.recover(data, signature);
  // The wallet should also have the channel, except when the data is the first message
  // that the player has received.
  // So, we need to read the channel off of the decoded data, rather than the wallet.
  const state = decode(data);
  if (state.mover.toLowerCase() !== address.toLowerCase()) {
    yield put(actions.validationFailure(requestId, 'INVALID SIGNATURE'));
  }

  yield put(actions.validationSuccess(requestId));
}

function* handleFundingRequest(wallet: ChannelWallet, walletEngine: WalletEngine) {
  yield put(displayActions.showWallet());
  let success;
  if (walletEngine.opponentAddress === AUTO_OPPONENT_ADDRESS) {
    success = true;
  } else {
    success = yield fundingSaga(wallet.channelId, walletEngine);
  }

  if (success) {
    yield put(actions.fundingSuccess(wallet.channelId));
    yield take(playerActions.CLOSE_WALLET);

  } else {
    yield put(actions.fundingFailure(wallet.channelId, 'Something went wrong'));
  }
  yield put(displayActions.hideWallet());
  return true;
}

export function* handleWithdrawalRequest(
  wallet: ChannelWallet,
  walletEngine: WalletEngine,
  position: State
) {
  yield put(displayActions.showWallet());
  // TODO: There's probably enough logic here to pull it out into it's own saga
  const { address: playerAddress, channelId } = wallet;
  walletEngine.requestWithdrawal();
  yield put(stateActions.stateChanged(walletEngine.state));
  yield take (playerActions.APPROVE_WITHDRAWAL);

  walletEngine.confirmWithdrawal(position.resolution[walletEngine.playerIndex]);
  yield put(stateActions.stateChanged(walletEngine.state));

  const destination = web3.eth.defaultAccount;
  walletEngine.selectWithdrawalAddress(destination,position.resolution[walletEngine.playerIndex]);
  yield put(stateActions.stateChanged(walletEngine.state));

  const data = [
    { type: SolidityType.address, value: playerAddress },
    { type: SolidityType.address, value: destination },
    { type: SolidityType.bytes32, value: wallet.channelId },
  ];

  const { v, r, s } = decodeSignature(wallet.sign(data));

  const proof = yield call(loadConclusionProof, wallet, position.channel.id);

  yield put(blockchainActions.concludeAndWithdrawRequest(proof, { playerAddress, channelId, destination, v, r, s }));
  const { transaction, reason: failureReason } = yield take([
    blockchainActions.CONCLUDEANDWITHDRAW_SUCCESS,
    blockchainActions.CONCLUDEANDWITHDRAW_FAILURE
  ]);

  if (transaction) {
    // TODO: broadcast the channelId
    const newState = walletEngine.withdrawalComplete();
    yield put(stateActions.stateChanged(newState));
    yield take(playerActions.CLOSE_WALLET);
    yield put(actions.withdrawalSuccess(transaction));
   

  } else {
    yield put(actions.withdrawalFailure(failureReason));
  }
  yield put(displayActions.hideWallet());
  return true;
}

function* blockchainEventListener(wallet: ChannelWallet) {
  while (true) {
    const action = yield take(blockchainActions.CHALLENGECREATED_EVENT);
    const challengeDate = action.expirationTime * 1000;
    // Ignore expired challenges for now
    if (Date.now() <= challengeDate) {
      const channelId = decode(action.state).channel.id;
      const { position: theirPosition, signature: theirSignature } = yield loadPosition(wallet, channelId, 'received');
      const { position: myPosition, signature: mySignature } = yield loadPosition(wallet, channelId, 'sent');

      const { challengeHandler } = yield race({
        challengeHandler: call(challengeSaga, action, theirPosition, theirSignature, myPosition, mySignature),
        conclusionAction: take(blockchainActions.CHALLENGECONCLUDED_EVENT),
      });

      if (challengeHandler) {
        // The challenge should have been handled, but has not yet
        // been concluded by the blockchain, so we block until the transaction
        // has succeeded
        yield take(blockchainActions.CHALLENGECONCLUDED_EVENT);
      }

      yield put(challengeActions.clearChallenge());
      yield put(displayActions.hideWallet());
    }
  }
}

function* loadConclusionProof(
  wallet: ChannelWallet,
  channelId: string,
) {
  const { position: theirPosition, signature: theirSignature } = yield loadPosition(wallet, channelId, 'received');
  const { position: myPosition, signature: mySignature } = yield loadPosition(wallet, channelId, 'sent');

  if (decode(myPosition).turnNum > decode(theirPosition).turnNum) {
    return new ConclusionProof(
      theirPosition,
      myPosition,
      theirSignature,
      mySignature,
    );
  } else {
    return new ConclusionProof(
      myPosition,
      theirPosition,
      mySignature,
      theirSignature,
    );
  }
}

function* loadChallengeProof(
  wallet: ChannelWallet,
  channelId: string
) {
  const { position: theirPosition, signature: theirSignature } = yield loadPosition(wallet, channelId, 'received');
  const { position: myPosition, signature: mySignature } = yield loadPosition(wallet, channelId, 'sent');

  return new ChallengeProof(
    theirPosition,
    myPosition,
    theirSignature,
    mySignature,
  );
}

function* loadPosition(
  wallet: ChannelWallet,
  channelId: string,
  direction: 'sent' | 'received',
) {
  const query = firebase.database().ref(
    `wallets/${wallet.id}/channels/${channelId}/${direction}`
  );
  const move = yield call([query, query.once], 'value');
  const { state: position, signature } = move.val();
  return { position, signature };
}
