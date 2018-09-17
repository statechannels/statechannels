import { fork, put, take, actionChannel, call, takeLatest, } from 'redux-saga/effects';

import { reduxSagaFirebase } from '../../gateways/firebase';

import * as lobbyActions from './actions';
import * as applicationActions from '../application/actions';

import GameEngineA from '../../game-engine/GameEngineA';
import BN from 'bn.js';
import { delay } from 'redux-saga';
import { CHALLENGE_EXPIRATION_INTERVAL } from '../../constants';

const DEFAULT_BALANCES = 50;

export default function* lobbySaga(address: string) {
  yield put(applicationActions.lobbySuccess());
  // subscribe to challenges
  yield fork(challengeSyncer);

  const channel = yield actionChannel([
    lobbyActions.ACCEPT_CHALLENGE,
    lobbyActions.CREATE_CHALLENGE,
  ]);

  while (true) {
    const action: lobbyActions.AnyAction = yield take(channel);

    switch (action.type) {
      case lobbyActions.ACCEPT_CHALLENGE:
        const gameEngine = GameEngineA.setupGame({
          me: address,
          opponent: action.address,
          stake: action.stake,
          balances: [action.stake.mul(new BN(DEFAULT_BALANCES)), action.stake.mul(new BN(DEFAULT_BALANCES))],
        });
        yield put(applicationActions.gameRequest(gameEngine));
        break;

      case lobbyActions.CREATE_CHALLENGE:
        yield put(applicationActions.waitingRoomRequest(action.name, action.stake));
        break;

      case lobbyActions.SYNC_CHALLENGES:
        // do nothing
        break;

      default:
      // todo: check unreachability
    }
  }
}

// maps { '0xabc': challenge1Data, ... } to [challenge1Data, ....]
const challengeTransformer = (dict) => {
  if (!dict.value) {
    return [];
  }
  return Object.keys(dict.value).map(key => {
    // Convert the stake from a string to a BN
    dict.value[key].stake = new BN(dict.value[key].stake);
    return dict.value[key];
  }).filter((challenge) => {
    // TODO: filter self challenges
    return Date.now() < challenge.updatedAt + CHALLENGE_EXPIRATION_INTERVAL
  })
};

function* challengeSyncer() {
  // TODO: figure out how to use a Firebase reference here to limit the data
  yield fork(
    reduxSagaFirebase.database.sync,
    'challenges',
    {
      successActionCreator: lobbyActions.syncChallenges,
      transform: challengeTransformer,
    },
    'value',
  );

  yield takeLatest(lobbyActions.SYNC_CHALLENGES, expireChallenges)
}

function* expireChallenges() {
  // This needs to be debounced at least as long as `CHALLENGE_EXPIRATION_INTERVAL`,
  // in case we've just received a challenge that was just refreshed (In fact, this
  // is the typical scenario.)
  yield call(delay, CHALLENGE_EXPIRATION_INTERVAL)
  const challenges = yield call(reduxSagaFirebase.database.read, '/challenges')
  if (challenges) {
    const activeChallenges = Object.keys(challenges).map(
      (addr) => challenges[addr]
    ).filter(
      c => Date.now() < c.updatedAt + CHALLENGE_EXPIRATION_INTERVAL
    )
    yield put(lobbyActions.expireChallenges(activeChallenges));
  }
}