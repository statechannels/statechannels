import { put, takeEvery, select } from 'redux-saga/effects';
import { GameState } from '../game/state';
import { createGame, chooseWeapon, playAgain, resign, joinOpenGame } from '../game/actions';
import { bigNumberify } from 'ethers/utils';
import { Weapon } from '../../core';
import { OpenGame } from '../open-games/state';

export function* autoPlayer(player: 'A' | 'B') {
  switch (player) {
    case 'A':
      yield autoPlayerARun();
      yield takeEvery('*', autoPlayerARun);
      break;
    case 'B':
      yield autoPlayerBRun();
      yield takeEvery('*', autoPlayerBRun);
      break;
  }
}

function* autoPlayerBRun() {
  // after every internal action, inspect my state, take any actions
  //    a. if in lobby, create a game
  //    b. if in chooseWeapon, choose rock
  //    c. if in playAgain, choose to playAgain

  const { localState, channelState }: GameState = yield select(getGameState);

  switch (localState.type) {
    case 'Lobby':
      yield put(createGame(bigNumberify(1).toString()));
      break;
    case 'ChooseWeapon':
      yield put(chooseWeapon(Weapon.Rock));
      break;
    case 'ResultPlayAgain':
      if (channelState && bigNumberify(channelState.turnNum).lt(12)) {
        yield put(playAgain());
      } else {
        yield put(resign());
      }
  }
}

const getGameState = (state: any): GameState => state.game;
const getOpenGame = (state: any): OpenGame | undefined => state.openGames[0];

function* autoPlayerARun() {
  // after every internal action, inspect my state, take any actions
  //    a. if in lobby, join a game (if one exists)
  //    b. if in chooseWeapon, choose rock
  //    c. if in playAgain, choose to playAgain

  const { localState, channelState }: GameState = yield select(getGameState);

  switch (localState.type) {
    case 'Lobby':
      const openGame = yield select(getOpenGame);
      if (openGame) {
        const { address, name, stake } = openGame;
        yield put(joinOpenGame(name, address, stake));
      }
      break;
    case 'ChooseWeapon':
      yield put(chooseWeapon(Weapon.Scissors));
      break;
    case 'ResultPlayAgain':
      if (channelState && bigNumberify(channelState.turnNum).lt(12)) {
        yield put(playAgain());
      } else {
        yield put(resign());
      }
  }
}
