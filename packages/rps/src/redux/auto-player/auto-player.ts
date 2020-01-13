import {put, takeEvery, select, take, cancel, fork} from 'redux-saga/effects';
import {GameState} from '../game/state';
import {
  createGame,
  chooseWeapon,
  playAgain,
  resign,
  joinOpenGame,
  gameOver,
  newOpenGame,
} from '../game/actions';
import {bigNumberify} from 'ethers/utils';
import {Weapon} from '../../core';
import {OpenGame} from '../open-games/state';
import {WeiPerEther} from 'ethers/constants';

// The auto-player simulates the actions of the user in an RPS game.
//
// To use it start the saga as part of your app setup:
//
//  function* rootSaga() {
//     yield fork(gameSaga, client);
//     yield fork(autoPlayer, 'A');
//     // ... start any other sagas
//
//  }
//
// The saga will then play for you in the app. Note that it plays _for_
// you, not _against_ you - if you want someone to play against you, you
// need to run the auto-opponent.
//

export function* main() {
  const tasks = {A: undefined, B: undefined};
  yield fork(starter);
  yield fork(stopper);
  function* starter() {
    while (true) {
      const action = yield take('StartAutoPlayer');
      // starts the task in the background
      if (tasks.A && action.player == 'B') {
        yield cancel(tasks.A);
        tasks.A = undefined;
        console.log('AutoPlayer A stopped');
      }
      if (tasks.B && action.player == 'A') {
        yield cancel(tasks.B);
        tasks.B = undefined;
        console.log('AutoPlayer B stopped');
      }
      tasks[action.player] = yield fork(autoPlayer, action.player); // get from action
      console.log('AutoPlayer ' + action.player + ' started');
    }
  }

  function* stopper() {
    while (true) {
      // wait for the user stop action
      const action = yield take('StopAutoPlayer');
      // user clicked stop. cancel the background task
      // this will cause the forked task to jump into its finally block
      yield cancel(tasks[action.player]);
      console.log('AutoPlayer ' + action.player + ' stopped');
    }
  }
}

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

  const {localState, channelState}: GameState = yield select(getGameState);

  switch (localState.type) {
    case 'Setup.Lobby':
      yield put(newOpenGame());
      break;
    case 'B.CreatingOpenGame':
      yield put(createGame(WeiPerEther.toString()));
      break;
    case 'B.ChooseWeapon':
      yield put(chooseWeapon(Weapon.Rock));
      break;
    case 'B.ResultPlayAgain':
      if (channelState && bigNumberify(channelState.turnNum).lt(12)) {
        yield put(playAgain());
      } else {
        yield put(resign(true));
      }
      break;
    case 'B.Resigned':
      yield put(gameOver());
      break;
    case 'B.InsufficientFunds':
      yield put(gameOver());
      break;
  }
}

const getGameState = (state: any): GameState => state.game;
const getOpenGame = (state: any): OpenGame | undefined => state.openGames[0];

function* autoPlayerARun() {
  // after every internal action, inspect my state, take any actions
  //    a. if in lobby, join a game (if one exists)
  //    b. if in chooseWeapon, choose scissors (will lose against autoPlayerB)
  //    c. if in playAgain, choose to playAgain

  const {localState, channelState}: GameState = yield select(getGameState);

  switch (localState.type) {
    case 'Setup.Lobby':
      const openGame = yield select(getOpenGame);
      if (openGame) {
        const {address, name, stake} = openGame;
        yield put(joinOpenGame(name, address, stake));
      }
      break;
    case 'A.ChooseWeapon':
      yield put(chooseWeapon(Weapon.Scissors));
      break;
    case 'A.ResultPlayAgain':
      if (channelState && bigNumberify(channelState.turnNum).lt(12)) {
        yield put(playAgain());
      } else {
        yield put(resign(true));
      }
      break;
    case 'A.Resigned':
      yield put(gameOver());
      break;
    case 'A.InsufficientFunds':
      yield put(gameOver());
      break;
  }
}
