import { take, select, call, put } from 'redux-saga/effects';
import { RPSChannelClient } from '../../utils/rps-channel-client';
import {
  AppData,
  hashPreCommit,
  calculateResult,
  updateAllocation,
  Player,
  ChannelState,
  ChannelStateVariant,
  RoundProposed,
} from '../../core';
import {
  updateChannelState,
  chooseSalt,
  resultArrived,
  startRound,
  FundingSituation,
  gameOver,
} from './actions';
import {
  GameState,
  ShutDownReason,
  LocalState,
  GameChosen,
  LocalStateWithPlayer,
  WeaponChosen,
} from './state';
import { randomHex } from '../../utils/randomHex';
import { bigNumberify, BigNumber } from 'ethers/utils';
import { unreachable } from '../../utils/unreachable';

const getGameState = (state: any): GameState => state.game;
const isClosed = (state: ChannelState | undefined): state is ChannelState =>
  (state && state.status === 'closed') || false;
const isEmpty = (state: ChannelState | undefined): state is undefined => !state;
const inChannelProposed = (state: ChannelState | undefined): state is ChannelState =>
  (state && state.status === 'proposed') || false;
const isPlayerA = (state: LocalStateWithPlayer): boolean => state.player === 'A';
const inRoundProposed = (state: ChannelState): state is ChannelStateVariant<RoundProposed> =>
  (state && state.appData.type === 'roundProposed') || false;

export function* gameSaga(rpsChannelClient: RPSChannelClient) {
  while (true) {
    yield take('*'); // run after every action

    const { localState, channelState }: GameState = yield select(getGameState);

    // if we have a conclude, move to shutting down
    // if we're done, move to gameOver
    if (isClosed(channelState) && localState.type !== 'GameOver') {
      yield* transitionToGameOver(localState, channelState);
      continue;
    }

    switch (localState.type) {
      case 'Empty':
        // nothing
        break;
      case 'Lobby':
        // nothing
        break;
      case 'WaitingRoom':
        break;
      case 'GameChosen': // player A
        if (isEmpty(channelState)) {
          yield* createChannel(localState, rpsChannelClient);
        }
        break;
      case 'OpponentJoined': // player B
        if (inChannelProposed(channelState)) {
          yield* joinChannel(channelState, rpsChannelClient);
        }
        break;
      case 'ChooseWeapon':
        break;
      case 'WeaponChosen':
        if (isEmpty(channelState)) {
          //raise error
          break;
        }

        if (isPlayerA(localState)) {
          yield* generateSaltAndSendPropose(localState, channelState, rpsChannelClient);
        } /* isPlayerB */ else if (inRoundProposed(channelState)) {
          yield* sendRoundAccepted(localState, channelState, rpsChannelClient);
        }
        break;
      case 'WeaponAndSaltChosen': // player A
        // if roundAccepted, calculateResultAndSendReveal
        break;
      case 'ResultPlayAgain':
        // nothing ?!
        break;
      case 'WaitForRestart':
        // if player A and in start, restart
        // if player B and reveal, sendStart and restart
        break;
      case 'ShuttingDown':
        // and my turn, send conclude
        break;
      case 'GameOver':
        break;
      default:
        unreachable(localState);
    }

    if ('player' in localState && localState.player === 'A') {
      if (
        localState.type === 'WeaponAndSaltChosen' &&
        channelState &&
        channelState.appData.type === 'roundAccepted'
      ) {
        const { myWeapon, salt } = localState;
        const { aBal, bBal, channelId } = channelState;
        const { playerBWeapon: theirWeapon, stake } = channelState.appData;
        const result = calculateResult(myWeapon, theirWeapon);
        const [aBal2, bBal2] = updateAllocation(
          result,
          Player.PlayerA,
          stake,
          bigNumberify(aBal),
          bigNumberify(bBal)
        );
        const fundingSituation = calculateFundingSituation(Player.PlayerA, aBal2, bBal2, stake);

        const reveal: AppData = {
          type: 'reveal',
          salt,
          playerAWeapon: myWeapon,
          playerBWeapon: theirWeapon,
        };

        const updatedChannelState = yield call(
          rpsChannelClient.updateChannel,
          channelId,
          aBal2.toString(),
          bBal2.toString(),
          reveal
        );
        yield put(updateChannelState(updatedChannelState));
        yield put(resultArrived(theirWeapon, result, fundingSituation));
      } else if (
        localState.type === 'WaitForRestart' &&
        channelState &&
        channelState.appData.type === 'start'
      ) {
        yield put(startRound());
      } else if (
        localState.type === 'GameChosen' &&
        channelState &&
        channelState.status === 'running'
      ) {
        yield put(startRound());
      } else if (
        localState.type === 'ShuttingDown' &&
        channelState &&
        bigNumberify(channelState.turnNum)
          .mod(2)
          .eq(1) // a's turn next
      ) {
        const closingChannelState = yield call(
          rpsChannelClient.closeChannel,
          channelState.channelId
        );
        yield put(updateChannelState(closingChannelState));
      }
    } else {
      // player b
      if (
        localState.type === 'WeaponChosen' &&
        channelState &&
        channelState.appData.type === 'roundProposed'
      ) {
      } else if (
        localState.type === 'WeaponChosen' &&
        channelState &&
        channelState.appData.type === 'reveal'
      ) {
        const { playerAWeapon: theirWeapon } = channelState.appData;
        const { aBal, bBal, channelId } = channelState;
        const { myWeapon, roundBuyIn } = localState;
        const result = calculateResult(myWeapon, theirWeapon);
        const fundingSituation = calculateFundingSituation(
          Player.PlayerB,
          bigNumberify(aBal),
          bigNumberify(bBal),
          bigNumberify(roundBuyIn)
        );
        yield put(resultArrived(theirWeapon, result, fundingSituation));
        if (fundingSituation !== 'Ok') {
          const state = yield call(rpsChannelClient.closeChannel, channelId);
          yield put(updateChannelState(state));
        }
      } else if (
        localState.type === 'WaitForRestart' &&
        channelState &&
        channelState.appData.type === 'reveal'
      ) {
        const { aBal, bBal, channelId } = channelState;
        const start: AppData = { type: 'start' };
        const state = yield call(rpsChannelClient.updateChannel, channelId, aBal, bBal, start);
        yield put(updateChannelState(state));
        yield put(startRound());
      } else if (
        localState.type === 'OpponentJoined' &&
        channelState &&
        channelState.status === 'running'
      ) {
        yield put(startRound());
      } else if (
        localState.type === 'ShuttingDown' &&
        channelState &&
        bigNumberify(channelState.turnNum)
          .mod(2)
          .eq(0) // b's turn next
      ) {
        const closingChannelState = yield call(
          rpsChannelClient.closeChannel,
          channelState.channelId
        );
        yield put(updateChannelState(closingChannelState));
      }
    }
  }
}

function* createChannel(localState: GameChosen, client: RPSChannelClient) {
  const openingBalance = localState.roundBuyIn.mul(5);
  const startState: AppData = { type: 'start' };
  const newChannelState = yield call(
    client.createChannel,
    localState.address,
    localState.opponentAddress,
    openingBalance.toString(),
    openingBalance.toString(),
    startState
  );
  yield put(updateChannelState(newChannelState));
}

function* joinChannel(channelState: ChannelState, client: RPSChannelClient) {
  const preFundSetup1 = yield call(client.joinChannel, channelState.channelId);
  yield put(updateChannelState(preFundSetup1));
}

function* generateSaltAndSendPropose(
  localState: WeaponChosen,
  channelState: ChannelState,
  client: RPSChannelClient
) {
  // if we're player A, we first generate a salt
  const salt = yield call(randomHex, 64);
  yield put(chooseSalt(salt)); // transitions us to WeaponAndSaltChosen

  const { myWeapon, roundBuyIn: stake } = localState;
  const { channelId, aBal, bBal } = channelState;

  const preCommit = hashPreCommit(myWeapon, salt);

  const roundProposed: AppData = { type: 'roundProposed', preCommit, stake };

  const updatedChannelState = yield call(
    client.updateChannel,
    channelId,
    aBal,
    bBal,
    roundProposed
  );
  yield put(updateChannelState(updatedChannelState));
}

function* sendRoundAccepted(
  localState: WeaponChosen,
  channelState: ChannelStateVariant<RoundProposed>,
  client: RPSChannelClient
) {
  const playerBWeapon = localState.myWeapon;
  const { channelId, aBal, bBal } = channelState;
  const { stake, preCommit } = channelState.appData;
  const roundAccepted: AppData = {
    type: 'roundAccepted',
    stake,
    preCommit,
    playerBWeapon,
  };

  const [aBal2, bBal2] = [
    bigNumberify(aBal)
      .sub(stake)
      .toString(),
    bigNumberify(bBal)
      .add(stake)
      .toString(),
  ];

  const newState = yield call(client.updateChannel, channelId, aBal2, bBal2, roundAccepted);
  yield put(updateChannelState(newState));
}

function* transitionToGameOver(localState: LocalState, channelState: ChannelState) {
  let reason: ShutDownReason = 'TheyResigned';
  if (localState.type === 'ShuttingDown') {
    reason = localState.reason;
  } else if (ourTurnToSend(localState, channelState)) {
    // if the channel is done and it's our turn, it means we must have initiated the shutdown
    reason = 'YouResigned';
  }
  yield put(gameOver(reason));
}

const ourTurnToSend = (localState: LocalState, channelState: ChannelState): boolean => {
  if (!('player' in localState)) {
    return false;
  }
  const playerIndex = localState.player === 'A' ? 0 : 1;

  return bigNumberify(channelState.turnNum)
    .sub(1) // for it to be our turn, the player before us must have just moved
    .mod(2)
    .eq(playerIndex);
};

const calculateFundingSituation = (
  player: Player,
  aBal: BigNumber,
  bBal: BigNumber,
  stake: BigNumber
): FundingSituation => {
  const [myBal, theirBal] = player === Player.PlayerA ? [aBal, bBal] : [bBal, aBal];

  if (myBal.lt(stake)) {
    return 'MyFundsTooLow';
  } else if (theirBal.lt(stake)) {
    return 'OpponentsFundsTooLow';
  } else {
    return 'Ok';
  }
};
