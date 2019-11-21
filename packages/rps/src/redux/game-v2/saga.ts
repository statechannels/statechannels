import {take, select, call, put} from 'redux-saga/effects';
// import { take } from 'redux-saga/effects';
import {RPSChannelClient} from '../../utils/rps-channel-client';
import {AppData, hashPreCommit, calculateResult, updateAllocation, Player} from '../../core';
import {updateChannelState, chooseSalt, resultArrived, restart} from './actions';
import {GameState} from './state';
import {randomHex} from '../../utils/randomHex';
import {bigNumberify} from 'ethers/utils';

const getGameState = (state: any): GameState => state.game;

export function* gameSaga(channelClient: RPSChannelClient) {
  // const _gameState: GameState =
  while (true) {
    yield take('*'); // run after every action

    const {localState, channelState}: GameState = yield select(getGameState);

    if ('player' in localState && localState.player === 'A') {
      if (localState.type === 'GameChosen' && !channelState) {
        const openingBalance = localState.roundBuyIn.mul(5);
        const startState: AppData = {type: 'start'};
        const newChannelState = yield call(
          channelClient.createChannel,
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
          channelClient.updateChannel,
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

        const reveal: AppData = {
          type: 'reveal',
          salt,
          playerAWeapon: myWeapon,
          playerBWeapon: theirWeapon,
        };

        const updatedChannelState = yield call(
          channelClient.updateChannel,
          channelId,
          aBal2,
          bBal2,
          reveal
        );
        yield put(updateChannelState(updatedChannelState));
        yield put(resultArrived(theirWeapon, result));
      } else if (
        localState.type === 'WaitForRestart' &&
        channelState &&
        channelState.appData.type === 'start'
      ) {
        yield put(restart());
      }
    }
  }

  // player A
  // ========
  // if (isPlayerA(gameState)) {
  //   if (challengeSelected(gameState)) {
  //     yield call(openChannel, gameState, channelClient);
  //   } else if(inStartState(gameState) && weaponChosen(gameState)) {
  //     yield call(proposeGame);
  //   } else if inRoundAcceptedState(gameState) {
  //     yield call(revealWeapon)
  //   } else if (inStartState(gameState) && !playAgain(gameState)) {
  //     yield call(concludeGame)
  //   }
  // }
  // if challengeSelected and no channelState
  // call openChannel
  // if appData.type == "resting" and myWeapon exists
  // then formulate propose and call update state
  // if appData.type == "accept"
  // then formulate reveal and call update state
  // if in reveal, formulate the result and whether enough funds to play again
  // if in resting, and don't want to play again
  // formulate conclude
  // if in resting or accept and resign
  // formulate conclude
  // player b
  // ========
  // if channelProposed, and has confirmed
  // call joinChannel
}
