import { fork, take, call, put, select, actionChannel } from 'redux-saga/effects';
import { buffers, eventChannel } from 'redux-saga';
import { reduxSagaFirebase } from '../../gateways/firebase';

import { Player } from '../../core';
import * as gameActions from '../game/actions';
import * as appActions from '../global/actions';
import { MessageState, WalletRequest } from './state';
import * as gameStates from '../game/state';
import { getMessageState, getGameState } from '../store';
import * as Wallet from 'magmo-wallet-client';
import { WALLET_IFRAME_ID } from '../../constants';
import { channelID } from 'fmg-core/lib/channel';
import { asCoreCommitment, fromCoreCommitment } from '../../core/rps-commitment';
import { Commitment } from 'fmg-core';
import { MessageRelayRequested } from 'magmo-wallet-client';

export enum Queue {
  WALLET = 'WALLET',
  GAME_ENGINE = 'GAME_ENGINE',
}

// export const getWalletAddress = (storeObj: any) => storeObj.wallet.address;

export default function* messageSaga() {
  yield fork(sendMessagesSaga);
  yield fork(waitForWalletThenReceiveFromFirebaseSaga);
  yield fork(sendWalletMessageSaga);
  yield fork(receiveChallengePositionFromWalletSaga);
  yield fork(receiveChallengeFromWalletSaga);
  yield fork(receiveDisplayEventFromWalletSaga);
  yield fork(exitGameSaga);
}

interface AppMessage {
  commitment: Commitment;
  signature: string;
  queue: Queue.GAME_ENGINE;
  userName?: string;
}

interface WalletMessage {
  payload: any;
  queue: Queue.WALLET;
  userName?: string;
}

type Message = AppMessage | WalletMessage;

export function* sendWalletMessageSaga() {
  const sendMessageChannel = createWalletEventChannel([Wallet.MESSAGE_RELAY_REQUESTED]);
  while (true) {
    const messageRelayRequest: MessageRelayRequested = yield take(sendMessageChannel);

    const { messagePayload, to } = messageRelayRequest;
    const messageToSend: WalletMessage = { payload: messagePayload, queue: Queue.WALLET };

    yield fork(
      reduxSagaFirebase.database.create,
      `/messages/${to.toLowerCase()}`,
      sanitizeMessageForFirebase(messageToSend),
    );
  }
}

export function* exitGameSaga() {
  const opponentConcludedChannel = createWalletEventChannel([Wallet.OPPONENT_CONCLUDED]);
  while (true) {
    yield take(opponentConcludedChannel);
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
    gameActions.CREATE_CHALLENGE,
  ]);
  while (true) {
    // We take any action that might trigger the outbox to be updated
    yield take(channel);
    const messageState: MessageState = yield select(getMessageState);
    const gameState: gameStates.GameState = yield select(getGameState);
    if (messageState.opponentOutbox) {
      const queue = Queue.GAME_ENGINE;
      const commitment = messageState.opponentOutbox.commitment;
      const signature = yield signMessage(commitment);
      const userName = gameState.name !== gameStates.StateName.NoName ? gameState.myName : '';
      const toSend: AppMessage = { commitment, queue, signature, userName };
      const { opponentAddress } = messageState.opponentOutbox;

      if (
        process.env.NODE_ENV === 'development' &&
        commitment.channel.participants[1] === process.env.SERVER_WALLET_ADDRESS
      ) {
        // To ease local development, we bypass firebase and make http requests directly against the local server
        const response = yield call(postData, { ...toSend, commitment: toSend.commitment });
        yield put(gameActions.messageSent());

        // Since the response is returned straight away, we have to receive the commitment immediately
        const { commitment: theirCommitment, signature: theirSignature } = response;
        yield receiveCommitmentSaga({
          commitment: theirCommitment,
          signature: theirSignature,
          queue: Queue.GAME_ENGINE,
          userName: 'Neo Bot',
        });
      } else {
        yield call(
          reduxSagaFirebase.database.create,
          `/messages/${opponentAddress.toLowerCase()}`,
          sanitizeMessageForFirebase(toSend),
        );
        yield put(gameActions.messageSent());
      }
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
    const value: Message = message.value;

    const key = message.snapshot.key;
    const { queue } = value;
    if (queue === Queue.GAME_ENGINE) {
      if ('signature' in value) {
        yield receiveCommitmentSaga(value);
      } else {
        throw new Error('Invalid game message received: signature missing');
      }
    } else {
      if ('payload' in value) {
        Wallet.relayMessage(WALLET_IFRAME_ID, value.payload);
      } else {
        throw new Error('Invalid wallet message received: message missing');
      }
    }

    yield call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`);
  }
}

// TODO: Type this properly
function createWalletEventChannel(walletEventTypes: Wallet.WalletEventType[]) {
  const listener = new Wallet.WalletEventListener();
  return eventChannel(emit => {
    walletEventTypes.forEach(eventType => {
      listener.subscribe(eventType, event => {
        emit(event);
      });
    });

    return () => {
      listener.unSubscribeAll();
    };
  }, buffers.fixed(10));
}

function* handleWalletMessage(walletMessage: WalletRequest, state: gameStates.PlayingState) {
  const { channel, player, allocation: balances, destination: participants } = state;
  const channelId = channelID(channel);

  switch (walletMessage.type) {
    case 'RESPOND_TO_CHALLENGE':
      if (
        state.name === gameStates.StateName.WaitForOpponentToPickWeaponA ||
        state.name === gameStates.StateName.WaitForRevealB ||
        state.name === gameStates.StateName.PickWeapon
      ) {
        Wallet.respondToOngoingChallenge(WALLET_IFRAME_ID, asCoreCommitment(walletMessage.data));
        yield put(gameActions.messageSent());
        const challengeCompleteChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
        yield take(challengeCompleteChannel);
        yield put(gameActions.challengeCompleted());
      }
      break;
    case 'FUNDING_REQUESTED':
      const myIndex = player === Player.PlayerA ? 0 : 1;

      const opponentAddress = participants[1 - myIndex];
      const myAddress = participants[myIndex];
      const fundingChannel = createWalletEventChannel([
        Wallet.FUNDING_SUCCESS,
        Wallet.FUNDING_FAILURE,
      ]);

      Wallet.startFunding(
        WALLET_IFRAME_ID,
        channelId,
        myAddress,
        opponentAddress,
        balances[myIndex],
        balances[1 - myIndex],
        myIndex,
      );
      const fundingResponse: Wallet.FundingResponse = yield take(fundingChannel);
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
    case 'CONCLUDE_REQUESTED':
      const conclusionChannel = createWalletEventChannel([
        Wallet.CONCLUDE_SUCCESS,
        Wallet.CONCLUDE_FAILURE,
      ]);
      Wallet.startConcludingGame(WALLET_IFRAME_ID, channelId);
      const concludeResponse = yield take(conclusionChannel);
      if (concludeResponse.type === Wallet.CONCLUDE_SUCCESS) {
        yield put(gameActions.messageSent());
        yield put(gameActions.exitToLobby());
      } else {
        yield put(gameActions.messageSent());
        if (concludeResponse.reason !== 'UserDeclined') {
          throw new Error(concludeResponse.error);
        }
      }
      break;
    case 'CHALLENGE_REQUESTED':
      const challengeChannel = createWalletEventChannel([
        Wallet.CHALLENGE_COMPLETE,
        Wallet.CONCLUDE_SUCCESS,
      ]);
      Wallet.startChallenge(WALLET_IFRAME_ID, channelId);
      yield put(gameActions.messageSent());
      const challengeResponse = yield take(challengeChannel);
      if (challengeResponse.type === Wallet.CHALLENGE_COMPLETE) {
        yield put(gameActions.challengeCompleted());
      }
      if (challengeResponse.type === Wallet.CONCLUDE_SUCCESS) {
        yield put(gameActions.messageSent());
        yield put(gameActions.exitToLobby());
      }

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

function* receiveDisplayEventFromWalletSaga() {
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
        throw new Error('recieveDisplayFromWalletSaga: unexpected event');
    }
  }
}

function* receiveChallengePositionFromWalletSaga() {
  const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMMITMENT_RECEIVED]); // TODO change to CHALLENGE_COMMITMENT_RECEIVED
  while (true) {
    const challengeCommitmentReceived: Wallet.ChallengeCommitmentReceived = yield take(
      challengeChannel,
    );
    const commitment = fromCoreCommitment(challengeCommitmentReceived.commitment);
    yield put(gameActions.commitmentReceived(commitment));
  }
}

function* receiveCommitmentSaga(message: AppMessage) {
  const { commitment: data, signature, userName } = message;
  const validMessage = yield validateMessage(data, signature);
  if (!validMessage) {
    // TODO: Handle this
  }

  if (data.turnNum === 0) {
    yield put(
      gameActions.initialCommitmentReceived(
        fromCoreCommitment(data),
        userName ? userName : 'Opponent',
      ),
    );
  } else {
    yield put(gameActions.commitmentReceived(fromCoreCommitment(data)));
  }
}

async function postData(data = {}) {
  const response = await fetch(`${process.env.BOT_URL}/api/v2/channels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await response.json(); // parses response to JSON
}

function* validateMessage(commitment: Commitment, signature) {
  try {
    return yield Wallet.validateCommitmentSignature(WALLET_IFRAME_ID, commitment, signature);
  } catch (err) {
    if (err.reason === 'WalletBusy') {
      const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
      yield take(challengeChannel);
      return yield Wallet.validateCommitmentSignature(WALLET_IFRAME_ID, commitment, signature);
    } else {
      throw new Error(err.error);
    }
  }
}

function* signMessage(commitment: Commitment) {
  try {
    return yield Wallet.signCommitment(WALLET_IFRAME_ID, commitment);
  } catch (err) {
    if (err.reason === 'WalletBusy') {
      const challengeChannel = createWalletEventChannel([Wallet.CHALLENGE_COMPLETE]);
      yield take(challengeChannel);
      return yield Wallet.signCommitment(WALLET_IFRAME_ID, commitment);
    } else {
      throw new Error(err.error);
    }
  }
}

function sanitizeMessageForFirebase(message) {
  return JSON.parse(JSON.stringify(message));
}
