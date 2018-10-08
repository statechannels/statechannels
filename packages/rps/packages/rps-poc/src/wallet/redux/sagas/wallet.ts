import { actionChannel, take, put, fork, call, cancel, } from 'redux-saga/effects';

import { initializeWallet } from './initialization';
import * as actions from '../actions/external';
import * as blockchainActions from '../actions/blockchain';
import ChannelWallet, { SignableData } from '../../domain/ChannelWallet';
import { fundingSaga } from './funding';
import { blockchainSaga } from './blockchain';
import { AUTO_OPPONENT_ADDRESS } from '../../../constants';
import { State, SolidityType, decodeSignature } from 'fmg-core';
import { default as firebase, reduxSagaFirebase, serverTimestamp } from '../../../gateways/firebase';
import { ConclusionProof } from '../../domain/ConclusionProof';
import decode from '../../domain/decode';
import WalletEngineA from '../../wallet-engine/WalletEngineA';
import { SelectWithdrawalAddress } from '../../wallet-engine/wallet-states/PlayerB';
import WalletEngineB from '../../wallet-engine/WalletEngineB';
import * as stateActions from '../actions/state';
import * as playerActions from '../actions/player';
export function* walletSaga(uid: string): IterableIterator<any> {
  const wallet = (yield initializeWallet(uid)) as ChannelWallet;

  yield put(actions.initializationSuccess(wallet.address));
  let runningBlockchainSaga = null;
  const channel = yield actionChannel([
    actions.FUNDING_REQUEST,
    actions.SIGNATURE_REQUEST,
    actions.VALIDATION_REQUEST,
    actions.WITHDRAWAL_REQUEST,
    actions.OPEN_CHANNEL_REQUEST,
    actions.CLOSE_CHANNEL_REQUEST,
    actions.STORE_MESSAGE_REQUEST
  ]);
  while (true) {
    const action: actions.RequestAction = yield take(channel);

    // The handlers below will block, so the wallet will only ever
    // process one action at a time from the queue.
    switch (action.type) {
      case actions.OPEN_CHANNEL_REQUEST:
        runningBlockchainSaga = yield fork(blockchainSaga);
        yield wallet.openChannel(action.channel);
        yield put(actions.channelOpened(wallet.channelId));
        break;

      case actions.CLOSE_CHANNEL_REQUEST:
        if (runningBlockchainSaga!=null){
          yield cancel(runningBlockchainSaga);
        }
        yield wallet.closeChannel();
        yield put(actions.channelClosed(wallet.id));
        break;

      case actions.SIGNATURE_REQUEST:
        yield handleSignatureRequest(wallet, action.requestId, action.data);
        break;

      case actions.STORE_MESSAGE_REQUEST:
        yield handleStoreMessageRequest(
          wallet,
          action.positionData,
          action.signature,
          action.direction,
        );
        break;

      case actions.VALIDATION_REQUEST:
        yield handleValidationRequest(
          wallet,
          action.requestId,
          action.data,
          action.signature,
          action.opponentIndex,
        );
        break;

      case actions.FUNDING_REQUEST:
        yield fork(handleFundingRequest, wallet, action.state);
        break;

      case actions.WITHDRAWAL_REQUEST:
        const { state } = action;
        yield handleWithdrawalRequest(wallet, state.position);
        break;

      default:
      // const _exhaustiveCheck: never = action;
      // todo: get this to work
      // currently causes a 'noUnusedLocals' error on compilation
      // underscored variables should be an exception but there seems to
      // be a bug in my current version of typescript
      // https://github.com/Microsoft/TypeScript/issues/15053
    }
  }
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

function* handleStoreMessageRequest(
  wallet: ChannelWallet,
  positionData: string,
  signature: string,
  direction: "sent" | "received"
) {
  const channelId = decode(positionData).channel.id;
  yield call(
    reduxSagaFirebase.database.update,
    `wallets/${wallet.id}/channels/${channelId}/${direction}`,
    { state: positionData, signature, updatedAt: serverTimestamp }
  );
}

function* handleValidationRequest(
  wallet: ChannelWallet,
  requestId,
  data: SignableData,
  signature: string,
  opponentIndex,
) {
  const address = wallet.recover(data, signature);
  // The wallet should also have the channel, except when the data is the first message
  // that the player has received.
  // So, we need to read the channel off of the decoded data, rather than the wallet.
  const state = decode(data);
  if (state.channel.participants[opponentIndex] !== address) {
    yield put(actions.validationFailure(requestId, 'INVALID SIGNATURE'));
  }

  yield put(actions.validationSuccess(requestId));
}

function* handleFundingRequest(wallet: ChannelWallet, state) {
  let success;
  if (state.opponentAddress === AUTO_OPPONENT_ADDRESS) {
    success = true;
  } else {
    success = yield fundingSaga(wallet.channelId, state);
  }

  if (success) {
    yield put(actions.fundingSuccess(wallet.channelId));
  } else {
    yield put(actions.fundingFailure(wallet.channelId, 'Something went wrong'));
  }
  return true;
}

export function* handleWithdrawalRequest(
  wallet: ChannelWallet,
  state,
) {
  // TODO: There's probably enough logic here to pull it out into it's own saga
  const { address: playerAddress, channelId } = wallet;

  const walletEngine = state.playerIndex === 0 ? new WalletEngineA(new SelectWithdrawalAddress()) : new WalletEngineB(new SelectWithdrawalAddress());
  yield put(stateActions.stateChanged(walletEngine.state));

  const action = yield take(playerActions.SELECT_WITHDRAWAL_ADDRESS);
  const destination = action.address;
  walletEngine.selectWithdrawalAddress(action.address);
  yield put(stateActions.stateChanged(walletEngine.state));

  const data = [
    { type: SolidityType.address, value: playerAddress },
    { type: SolidityType.address, value: destination },
    { type: SolidityType.bytes32, value: wallet.channelId },
  ];

  const { v, r, s } = decodeSignature(wallet.sign(data));

  const proof = yield call(loadConclusionProof, wallet, state);

  yield put(blockchainActions.withdrawRequest(proof, { playerAddress, channelId, destination, v, r, s }));
  const { transaction, reason: failureReason } = yield take([
    blockchainActions.WITHDRAW_SUCCESS,
    blockchainActions.WITHDRAW_FAILURE
  ]);

  if (transaction) {
    // TODO: broadcast the channelId
    yield put(actions.withdrawalSuccess(transaction));
  } else {
    yield put(actions.withdrawalFailure(failureReason));
  }

  return true;
}

function* loadConclusionProof(
  wallet: ChannelWallet,
  state: State
) {
  const yourQuery = firebase.database().ref(
    `wallets/${wallet.id}/channels/${state.channel.id}/received`
  );
  const yourMove = yield call([yourQuery, yourQuery.once], 'value');
  const { state: yourState, signature: yourSignature } = yourMove.val();

  const myQuery = firebase.database().ref(
    `wallets/${wallet.id}/channels/${state.channel.id}/sent`
  );
  const myMove = yield call([myQuery, myQuery.once], 'value');
  const { state: myState, signature: mySignature } = myMove.val();

  return new ConclusionProof(
    myState,
    yourState,
    mySignature,
    yourSignature,
  );
}