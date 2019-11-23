import { take, select, call, put } from 'redux-saga/effects';
import { RPSChannelClient } from '../../utils/rps-channel-client';
import {
  AppData,
  hashPreCommit,
  calculateResult,
  updateAllocation,
  Player,
  ChannelState,
  RoundProposed,
  RoundAccepted,
  Reveal,
} from '../../core';
import {
  isClosed,
  isEmpty,
  inChannelProposed,
  isRunning,
  inRoundProposed,
  inRoundAccepted,
  inReveal,
  inStart,
} from '../../core/channel-state';
import {
  updateChannelState,
  chooseSalt,
  resultArrived,
  startRound as startRoundAction,
  FundingSituation,
  gameOver,
} from './actions';
import {
  GameState,
  ShutDownReason,
  LocalState,
  GameChosen,
  WeaponChosen,
  WeaponAndSaltChosen,
  isPlayerA,
  isPlayerB,
} from './state';
import { randomHex } from '../../utils/randomHex';
import { bigNumberify, BigNumber } from 'ethers/utils';

const getGameState = (state: any): GameState => state.game;
const isPlayersTurnNext = (
  localState: LocalState,
  channelState?: ChannelState
): channelState is ChannelState => {
  if (!('player' in localState) || !channelState) {
    return false;
  }
  const playerIndex = localState.player === 'A' ? 0 : 1;

  return bigNumberify(channelState.turnNum)
    .sub(1) // for it to be our turn, the player before us must have just moved
    .mod(2)
    .eq(playerIndex);
};

export function* gameSaga(client: RPSChannelClient) {
  while (true) {
    yield take('*'); // run after every action

    const { localState, channelState }: GameState = yield select(getGameState);

    if (isClosed(channelState) && localState.type !== 'GameOver') {
      yield* transitionToGameOver(localState, channelState);
      continue;
    }

    switch (localState.type) {
      case 'GameChosen': // player A
        if (isEmpty(channelState)) {
          yield* createChannel(localState, client);
        } else if (isRunning(channelState)) {
          yield* startRound();
        }

        break;
      case 'OpponentJoined': // player B
        if (inChannelProposed(channelState)) {
          yield* joinChannel(channelState, client);
        } else if (isRunning(channelState)) {
          yield* startRound();
        }
        break;
      case 'WeaponChosen':
        if (isPlayerA(localState)) {
          if (isEmpty(channelState)) {
            // raise error
            break;
          }
          yield* generateSaltAndSendPropose(localState, channelState, client);
        } else {
          // player b
          if (inRoundProposed(channelState)) {
            yield* sendRoundAccepted(localState, channelState, client);
          } else if (inReveal(channelState)) {
            yield* calculateResultAndCloseChannelIfNoFunds(localState, channelState, client);
          }
        }
        break;
      case 'WeaponAndSaltChosen': // player A
        if (inRoundAccepted(channelState)) {
          yield* calculateResultAndSendReveal(localState, channelState, client);
        }
        break;
      case 'WaitForRestart':
        if (isPlayerA(localState) && inStart(channelState)) {
          yield* startRound();
        } else if (isPlayerB(localState) && inReveal(channelState)) {
          yield* sendStartAndStartRound(channelState, client);
        }
        break;
      case 'ShuttingDown':
        if (isPlayersTurnNext(localState, channelState)) {
          yield* closeChannel(channelState, client);
        }
        break;
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

function* startRound() {
  yield put(startRoundAction());
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
  channelState: ChannelState<RoundProposed>,
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

function* calculateResultAndSendReveal(
  localState: WeaponAndSaltChosen,
  channelState: ChannelState<RoundAccepted>,
  client: RPSChannelClient
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
    client.updateChannel,
    channelId,
    aBal2.toString(),
    bBal2.toString(),
    reveal
  );
  yield put(updateChannelState(updatedChannelState));
  yield put(resultArrived(theirWeapon, result, fundingSituation));
}

function* calculateResultAndCloseChannelIfNoFunds(
  localState: WeaponChosen,
  channelState: ChannelState<Reveal>,
  client: RPSChannelClient
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
    const state = yield call(client.closeChannel, channelId);
    yield put(updateChannelState(state));
  }
}

function* sendStartAndStartRound(channelState: ChannelState<Reveal>, client: RPSChannelClient) {
  const { aBal, bBal, channelId } = channelState;
  const start: AppData = { type: 'start' };
  const state = yield call(client.updateChannel, channelId, aBal, bBal, start);
  yield put(updateChannelState(state));
  yield put(startRoundAction());
}

function* closeChannel(channelState: ChannelState, client: RPSChannelClient) {
  const closingChannelState = yield call(client.closeChannel, channelState.channelId);
  yield put(updateChannelState(closingChannelState));
}

function* transitionToGameOver(localState: LocalState, channelState: ChannelState) {
  let reason: ShutDownReason = 'TheyResigned';
  if (localState.type === 'ShuttingDown') {
    reason = localState.reason;
  } else if (isPlayersTurnNext(localState, channelState)) {
    // if the channel is done and it's our turn, it means we must have initiated the shutdown
    reason = 'YouResigned';
  }
  yield put(gameOver(reason));
}

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
