import { RPSChannelClient } from '../../utils/rps-channel-client';
import { eventChannel, buffers } from 'redux-saga';
import { put, take, fork, takeEvery, select, call, actionChannel, race } from 'redux-saga/effects';
import { expectSaga } from 'redux-saga-test-plan';
import { GameState, lobby } from './state';
import {
  createGame,
  chooseWeapon,
  playAgain,
  resign,
  joinOpenGame,
  gameJoined as gameJoinedAction,
} from './actions';
import { bigNumberify } from 'ethers/utils';
import { syncOpenGames } from '../open-games/actions';
import { Weapon } from '../../core';
import { OpenGame } from '../open-games/state';
import { gameSaga } from './saga';
import { combineReducers } from 'redux';
import { gameReducer } from './reducer';
import { openGamesReducer } from '../open-games/reducer';
import { channelUpdatedListener } from '../message-service/channel-updated-listener';

const reducer = combineReducers({
  game: gameReducer,
  openGames: openGamesReducer,
});

it('runs to GameOver', async () => {
  const client = new RPSChannelClient();
  function* saga() {
    yield fork(gameSaga, client);
    yield fork(autoPlayer, 'A');
    yield fork(autoOpponent, 'B', client);
    yield fork(channelUpdatedListener, client);
  }
  const initialState = {
    game: {
      localState: lobby({ name: 'Player A', address: 'blah' }),
      channelState: null,
    },
    openGames: [],
  };

  const { storeState } = await expectSaga(saga)
    .withReducer(reducer, initialState)
    .run(5000);

  expect(storeState.game.localState.type).toEqual('GameOver');
}, 6000);

export function* autoOpponent(player: 'A' | 'B', externalClient: RPSChannelClient) {
  let internalStoreState = {
    game: {
      localState: lobby({ name: 'AutoBot', address: 'blah' }),
      channelState: null,
    } as GameState,
    openGames: [],
  };

  const internalClient = new RPSChannelClient();

  function* internalSaga() {
    yield fork(gameSaga, internalClient);
    yield fork(autoPlayer, player);
    yield fork(channelUpdatedListener, internalClient);
  }

  const subscribeToIncomingMessages = emit => externalClient.onMessageQueued(emit);
  const incomingMessageChannel = eventChannel(subscribeToIncomingMessages, buffers.fixed(10));

  const subscribeToOutgoingMessages = emit => internalClient.onMessageQueued(emit);
  const outgoingMessageChannel = eventChannel(subscribeToOutgoingMessages, buffers.fixed(10));

  // if auto-player-b created a game, then auto-player-a needs to know
  // if A joins a game, then auto-player-b needs to know
  const gameJoinedChannel = yield actionChannel('JoinOpenGame', buffers.fixed(10));

  // if B created a game, then auto-player-a needs to know
  const gameCreatedChannel = yield actionChannel('CreateGame', buffers.fixed(10));
  // and then when A joins, B needs to know

  // we need the loop to run once before being triggered, so create a special action
  const initializerChannel = yield actionChannel('@@AutoPlayerInitializer', buffers.fixed(10));
  yield put({ type: '@@AutoPlayerInitializer' });

  while (true) {
    const { incomingMessage, outgoingMessage, gameJoined, gameCreated } = yield race({
      incomingMessage: take(incomingMessageChannel),
      outgoingMessage: take(outgoingMessageChannel),
      gameJoined: take(gameJoinedChannel),
      gameCreated: take(gameCreatedChannel),
      initialized: take(initializerChannel),
    });

    // with outgoing messages, we don't need to run the internal saga
    if (outgoingMessage) {
      yield call([externalClient, 'pushMessage'], outgoingMessage);
      continue;
    }

    // we set up the saga
    const saga = expectSaga(internalSaga).withReducer(reducer, internalStoreState);
    // start it running
    const promise = saga.silentRun(100);
    // and then quickly trigger the appropriate event, before expectSaga times out o_O
    if (incomingMessage) {
      internalClient.pushMessage(incomingMessage);
    } else if (gameJoined) {
      saga.dispatch(gameJoinedAction('regular-player', 'some-address'));
    } else if (gameCreated) {
      saga.dispatch(
        syncOpenGames([
          {
            address: 'todo: regular-player-address',
            name: 'regular-player',
            stake: gameCreated.roundBuyIn,
            createdAt: new Date().getTime(),
            isPublic: true,
          },
        ])
      );
    }
    const result = yield call(() => promise);
    internalStoreState = result.storeState;

    // finally we inspect the result to see if the auto-player just create/joined a game
    if (internalStoreState.game.localState.type === 'WaitingRoom') {
      yield put(
        syncOpenGames([
          {
            address: 'todo: autoPlayerAddress',
            name: 'AutoPlayer',
            stake: bigNumberify(1).toString(),
            createdAt: new Date().getTime(),
            isPublic: true,
          },
        ])
      );
    } else if (internalStoreState.game.localState.type === 'GameChosen') {
      yield put(gameJoinedAction('AutoPlayer', 'some-address'));
    }
  }
}

function* autoPlayer(player: 'A' | 'B') {
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
