import { fork, take, call, put, select, actionChannel } from 'redux-saga/effects';
import { buffers, eventChannel } from 'redux-saga';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { Player, } from '../../core';
import * as gameActions from '../game/actions';
import * as appActions from '../global/actions';
import { MessageState, WalletMessage } from './state';
import * as gameStates from '../game/state';
import { getMessageState, getGameState } from '../store';
import * as Wallet from 'magmo-wallet-client';
import { WALLET_IFRAME_ID } from '../../constants';
import { channelID } from 'fmg-core/lib/channel';
import { RPSCommitment, asCoreCommitment, fromCoreCommitment, PRE_FUND_SETUP_A } from '../../core/rps-commitment';
import { ChallengeCommitmentReceived, FundingResponse } from 'magmo-wallet-client';

export enum Queue {
  WALLET = 'WALLET',
  GAME_ENGINE = 'GAME_ENGINE',
}

// export const getWalletAddress = (storeObj: any) => storeObj.wallet.address;

export default function* messageSaga() {
  yield fork(sendMessagesSaga);
  yield fork(waitForWalletThenReceiveFromFirebaseSaga);
  yield fork(sendWalletMessageSaga);
  yield fork(exitGameSaga);
  yield fork(receiveChallengePositionFromWalletSaga);
  yield fork(receiveChallengeFromWalletSaga);
  yield fork(recieveDisplayEventFromWalletSaga);
}

export function* sendWalletMessageSaga() {
  while (true) {
    const sendMessageChannel = createWalletEventChannel([Wallet.MESSAGE_REQUEST]);
    const messageRequest = yield take(sendMessageChannel);
    const queue = Queue.WALLET;
    const { data, to, signature } = messageRequest;
    const message = { data, queue, signature };
    yield call(reduxSagaFirebase.database.create, `/messages/${to.toLowerCase()}`, message);
  }
}

export function* exitGameSaga() {
  const closeGameChannel = createWalletEventChannel([Wallet.CLOSE_SUCCESS]);
  while (true) {
    yield take(closeGameChannel);
    yield put(gameActions.exitToLobby());
  }
}

export function* sendMessagesSaga() {
  // We need to use an actionChannel to queue up actions that
  // might be put from this saga
  const channel = yield actionChannel([
    gameActions.CHOOSE_WEAPON,
    gameActions.CONFIRM_GAME,
    gameActions.CREATE_OPEN_GAME,
    gameActions.INITIAL_COMMITMENT_RECEIVED,
    gameActions.PLAY_AGAIN,
    gameActions.COMMITMENT_RECEIVED,
    gameActions.FUNDING_SUCCESS,
    gameActions.JOIN_OPEN_GAME,
    gameActions.RESIGN,
    gameActions.CREATE_CHALLENGE
  ]);
  while (true) {
    // We take any action that might trigger the outbox to be updated
    yield take(channel);
    const messageState: MessageState = yield select(getMessageState);
    const gameState: gameStates.GameState = yield select(getGameState);
    if (messageState.opponentOutbox) {
      const queue = Queue.GAME_ENGINE;
      const data = messageState.opponentOutbox.commitment;
      const signature = yield signMessage(data);
      const userName = gameState.name !== gameStates.StateName.NoName ? gameState.myName : "";
      const message = { data, queue, signature, userName };
      const { opponentAddress } = messageState.opponentOutbox;

      yield call(reduxSagaFirebase.database.create, `/messages/${opponentAddress.toLowerCase()}`, message);
      yield put(gameActions.messageSent());
    }
    if (messageState.walletOutbox) {
      if (
        gameState.name !== gameStates.StateName.Lobby &&
        gameState.name !== gameStates.StateName.WaitingRoom &&
        gameState.name !== gameStates.StateName.CreatingOpenGame &&
        gameState.name !== gameStates.StateName.NoName
      ) {
        yield handleWalletMessage(messageState.walletOutbox, gameState);
      }
    }

  }
}

function* waitForWalletThenReceiveFromFirebaseSaga() {
  while (true) {
    yield take('*');

    const gameState: gameStates.GameState = yield select(getGameState);
    const address = gameState.myAddress;

    if (address) {
      // this will never return
      yield receiveFromFirebaseSaga(address);
    }
  }
}

function* receiveFromFirebaseSaga(address) {
  address = address.toLowerCase();

  const channel = yield call(
    reduxSagaFirebase.database.channel,
    `/messages/${address}`,
    'child_added',
    buffers.fixed(10),
  );

  while (true) {
    const message = yield take(channel);

    const key = message.snapshot.key;
    const { data, queue, userName } = message.value;

    if (queue === Queue.GAME_ENGINE) {
      const { signature } = message.value;
      const validMessage = yield validateMessage(data, signature);
      if (!validMessage) {
        // TODO: Handle this
      }

      const commitment = data;
      if (commitment.commitmentName === PRE_FUND_SETUP_A) {
        yield put(gameActions.initialCommitmentReceived(commitment, userName ? userName : 'Opponent'));
      } else {
        yield put(gameActions.commitmentReceived(commitment));
      }
    } else {

      const { signature } = message.value;
      Wallet.messageWallet(WALLET_IFRAME_ID, data, signature);

    }
    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}

// TODO: Type this properly
function createWalletEventChannel(walletEventTypes: Wallet.WalletEventType[]) {
  const listener = new Wallet.WalletEventListener();
  return eventChannel(emit => {
    walletEventTypes.forEach(eventType => {
      listener.subscribe(eventType, (event) => {
        emit(event);
      });
    });

    return () => {
      listener.unSubscribeAll();
    };
  });
}

function* handleWalletMessage(walletMessage: WalletMessage, state: gameStates.PlayingState) {

  const { channel, player, allocation: balances, destination: participants } = state;

  const channelId = channelID(channel);

  switch (walletMessage.type) {
    case "RESPOND_TO_CHALLENGE":
      if (state.name === gameStates.StateName.WaitForOpponentToPickWeaponA ||
        state.name === gameStates.StateName.WaitForRevealB ||
        state.name === gameStates.StateName.PickWeapon) {
        Wallet.respondToOngoingChallenge(WALLET_IFRAME_ID, asCoreCommitment(walletMessage.data));
        yield put(gameActions.messageSent());
        const challengeCompleteChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
        yield take(challengeCompleteChannel);
        yield put(gameActions.challengeCompleted());
      }
      break;
    case "FUNDING_REQUESTED":

      const myIndex = player === Player.PlayerA ? 0 : 1;

      const opponentAddress = participants[1 - myIndex];
      const myAddress = participants[myIndex];
      const fundingChannel = createWalletEventChannel([Wallet.FUNDING_SUCCESS, Wallet.FUNDING_FAILURE]);

      Wallet.startFunding(WALLET_IFRAME_ID, channelId, myAddress, opponentAddress, balances[myIndex], balances[1 - myIndex], myIndex);
      const fundingResponse: FundingResponse = yield take(fundingChannel);
      if (fundingResponse.type === Wallet.FUNDING_FAILURE) {
        if (fundingResponse.reason === 'FundingDeclined') {
          yield put(gameActions.exitToLobby());
        } else {
          throw new Error(fundingResponse.error);
        }
      } else {
        yield put(gameActions.messageSent());
        const commitment = fromCoreCommitment(fundingResponse.commitment);
        yield put(gameActions.fundingSuccess(commitment));
      }
      break;
    case "CONCLUDE_REQUESTED":
      const conclusionChannel = createWalletEventChannel([Wallet.CONCLUDE_SUCCESS, Wallet.CONCLUDE_FAILURE]);
      Wallet.startConcludingGame(WALLET_IFRAME_ID);
      const concludeResponse = yield take(conclusionChannel);
      if (concludeResponse.type === Wallet.CONCLUDE_SUCCESS) {
        yield put(gameActions.messageSent());
        yield put(gameActions.exitToLobby());
      } else {
        if (concludeResponse.reason !== 'UserDeclined') {
          throw new Error(concludeResponse.error);
        }
      }
      break;
    case "CHALLENGE_REQUESTED":
      const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
      Wallet.startChallenge(WALLET_IFRAME_ID);
      yield put(gameActions.messageSent());
      yield take(challengeChannel);
      yield put(gameActions.challengeCompleted());

      break;
  }
}

function* receiveChallengeFromWalletSaga() {
  const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_RESPONSE_REQUESTED]);

  while (true) {
    yield take(challengeChannel);
    yield put(gameActions.challengeResponseRequested());


  }
}

function* recieveDisplayEventFromWalletSaga() {
  const displayChannel = createWalletEventChannel([Wallet.SHOW_WALLET, Wallet.HIDE_WALLET]);
  while (true) {
    const event = yield take(displayChannel);
    switch (event.type) {
      case Wallet.SHOW_WALLET:
        yield put(appActions.showWallet());
        break;
      case Wallet.HIDE_WALLET:
        yield put(appActions.hideWallet());
        break;
      default:
        throw new Error(
          'recieveDisplayFromWalletSaga: unexpected event'
        );
    }
  }
}

function* receiveChallengePositionFromWalletSaga() {
  const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMMITMENT_RECEIVED]); // TODO change to CHALLENGE_COMMITMENT_RECEIVED
  while (true) {
    const challengeCommitmentReceived: ChallengeCommitmentReceived = yield take(challengeChannel);
    const commitment = fromCoreCommitment(challengeCommitmentReceived.commitment);
    yield put(gameActions.commitmentReceived(commitment));
  }
}


function* validateMessage(commitment: RPSCommitment, signature) {
  try {
    return yield Wallet.validateCommitmentSignature(WALLET_IFRAME_ID, asCoreCommitment(commitment), signature);
  } catch (err) {
    if (err.reason === 'WalletBusy') {
      const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
      yield take(challengeChannel);
      return yield Wallet.validateCommitmentSignature(WALLET_IFRAME_ID, asCoreCommitment(commitment), signature);
    } else {
      throw new Error(err.error);
    }
  }
}

function* signMessage(commitment: RPSCommitment) {
  try {
    return yield Wallet.signCommitment(WALLET_IFRAME_ID, asCoreCommitment(commitment));
  } catch (err) {
    if (err.reason === 'WalletBusy') {
      const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
      yield take(challengeChannel);
      return yield Wallet.signCommitment(WALLET_IFRAME_ID, asCoreCommitment(commitment));
    } else {
      throw new Error(err.error);
    }
  }
}
