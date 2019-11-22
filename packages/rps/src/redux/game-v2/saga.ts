import {take, select, call, put} from 'redux-saga/effects';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {AppData, hashPreCommit, calculateResult, updateAllocation, Player} from '../../core';
import {
  updateChannelState,
  chooseSalt,
  resultArrived,
  startRound,
  FundingSituation,
} from './actions';
import {GameState} from './state';
import {randomHex} from '../../utils/randomHex';
import {bigNumberify, BigNumber} from 'ethers/utils';

const getGameState = (state: any): GameState => state.game;

export function* gameSaga(rpsChannelClient: RPSChannelClient) {
  while (true) {
    yield take('*'); // run after every action

    const {localState, channelState}: GameState = yield select(getGameState);

    if ('player' in localState && localState.player === 'A') {
      if (localState.type === 'GameChosen' && !channelState) {
        const openingBalance = localState.roundBuyIn.mul(5);
        const startState: AppData = {type: 'start'};
        const newChannelState = yield call(
          rpsChannelClient.createChannel,
          localState.address,
          localState.opponentAddress,
          openingBalance.toString(),
          openingBalance.toString(),
          startState
        );
        yield put(updateChannelState(newChannelState));
      } else if (localState.type === 'WeaponChosen' && channelState) {
        // if we're player A, we first generate a salt
        const salt = yield call(randomHex, 64);
        yield put(chooseSalt(salt)); // transitions us to WeaponAndSaltChosen

        const {myWeapon, roundBuyIn: stake} = localState;
        const {channelId, aBal, bBal} = channelState;

        const preCommit = hashPreCommit(myWeapon, salt);

        const roundProposed: AppData = {type: 'roundProposed', preCommit, stake};

        const updatedChannelState = yield call(
          rpsChannelClient.updateChannel,
          channelId,
          aBal,
          bBal,
          roundProposed
        );
        yield put(updateChannelState(updatedChannelState));
      } else if (
        localState.type === 'WeaponAndSaltChosen' &&
        channelState &&
        channelState.appData.type === 'roundAccepted'
      ) {
        const {myWeapon, salt} = localState;
        const {aBal, bBal, channelId} = channelState;
        const {playerBWeapon: theirWeapon, stake} = channelState.appData;
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
        localState.type === 'OpponentJoined' &&
        channelState &&
        channelState.status === 'proposed'
      ) {
        const preFundSetup1 = yield call(rpsChannelClient.joinChannel, channelState.channelId);
        yield put(updateChannelState(preFundSetup1));
      } else if (
        localState.type === 'WeaponChosen' &&
        channelState &&
        channelState.appData.type === 'roundProposed'
      ) {
        const playerBWeapon = localState.myWeapon;
        const {channelId, aBal, bBal} = channelState;
        const {stake, preCommit} = channelState.appData;
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

        const newState = yield call(
          rpsChannelClient.updateChannel,
          channelId,
          aBal2,
          bBal2,
          roundAccepted
        );
        yield put(updateChannelState(newState));
      } else if (
        localState.type === 'WeaponChosen' &&
        channelState &&
        channelState.appData.type === 'reveal'
      ) {
        const {playerAWeapon: theirWeapon} = channelState.appData;
        const {aBal, bBal, channelId} = channelState;
        const {myWeapon, roundBuyIn} = localState;
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
        const {aBal, bBal, channelId} = channelState;
        const start: AppData = {type: 'start'};
        const state = yield call(rpsChannelClient.updateChannel, channelId, aBal, bBal, start);
        yield put(updateChannelState(state));
        yield put(startRound());
      } else if (
        localState.type === 'OpponentJoined' &&
        channelState &&
        channelState.status === 'running'
      ) {
        yield put(startRound());
      }
    }
  }
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
