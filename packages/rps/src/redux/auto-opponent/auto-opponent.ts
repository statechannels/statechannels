import {RPSChannelClient} from '../../utils/rps-channel-client';
import {eventChannel, buffers} from 'redux-saga';
import {put, take, fork, call, actionChannel, race} from 'redux-saga/effects';
import {expectSaga} from 'redux-saga-test-plan';
import {GameState, Setup} from '../game/state';
import {gameJoined as gameJoinedAction} from '../game/actions';
import {syncOpenGames} from '../open-games/actions';
import {gameSaga} from '../game/saga';
import {channelUpdatedListener} from '../message-service/channel-updated-listener';
import {autoPlayer} from './auto-player';
import {combineReducers} from 'redux';
import {gameReducer} from '../game/reducer';
import {openGamesReducer} from '../open-games/reducer';
import {WeiPerEther} from 'ethers/constants';
import {FakeChannelClient} from '@statechannels/channel-client';

// The auto-opponent simulates the actions of the opponent in an RPS game.
//
// To use it start the saga as part of your app setup:
//
//  function* rootSaga() {
//     yield fork(gameSaga, client);
//     yield fork(autoOpponent, 'A');
//     // ... start any other sagas
//
//  }
//
// The saga will then play for against you in the app.
//
// Roughly, the auto-opponent works by starting up a second copy of
// the app, with an auto-player running, and then wires these two
// apps together, cutting firebase out of the loop.
//
export function* autoOpponent(player: 'A' | 'B', externalClient: RPSChannelClient) {
  let internalStoreState = {
    game: {
      localState: Setup.lobby({name: 'AutoBot', address: 'blah', outcomeAddress: 'blah'}),
      channelState: null,
    } as GameState,
    openGames: [],
  };
  const internalClient = new RPSChannelClient(new FakeChannelClient('0xDoesNotMatter'));
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
  yield put({type: '@@AutoPlayerInitializer'});

  while (true) {
    const {incomingMessage, outgoingMessage, gameJoined, gameCreated} = yield race({
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
      saga.dispatch(gameJoinedAction('regular-player', 'some-address', 'some-EOA'));
    } else if (gameCreated) {
      saga.dispatch(
        syncOpenGames([
          {
            address: 'todo: regular-player-address',
            outcomeAddress: 'todo: regular-player-outcome-address',
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
    if (internalStoreState.game.localState.type === 'B.WaitingRoom') {
      yield put(
        syncOpenGames([
          {
            address: 'todo: autoPlayerAddress',
            outcomeAddress: 'todo: autoPlayerOutcomeAddress',
            name: 'AutoPlayer',
            stake: WeiPerEther.toString(),
            createdAt: new Date().getTime(),
            isPublic: true,
          },
        ])
      );
    } else if (internalStoreState.game.localState.type === 'A.GameChosen') {
      yield put(gameJoinedAction('AutoPlayer', 'some-address', 'some-EOA'));
    }
  }
}

export const reducer = combineReducers({
  game: gameReducer,
  openGames: openGamesReducer,
});
