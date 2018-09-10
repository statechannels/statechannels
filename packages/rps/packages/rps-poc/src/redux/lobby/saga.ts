import { fork, put, take, actionChannel } from 'redux-saga/effects';

import { reduxSagaFirebase } from '../../gateways/firebase';

import * as lobbyActions from './actions';
import * as applicationActions from '../application/actions';

import GameEngineA from '../../game-engine/GameEngineA';
import BN from 'bn.js';

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
          balances: [action.stake.mul(new BN(3)), action.stake.mul(new BN(3))],
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
  return Object.keys(dict.value).map(key => {
    // Convert the stake from a string to a BN
    dict.value[key].stake = new BN(dict.value[key].stake);
    return dict.value[key];
  }).filter((challenge) => {
    return challenge.expiresAt > Date.now().toFixed()
})};

function* challengeSyncer() {
  // Since everyone who is currently posting a challenge is refreshing it
  // at a certain interval, the transformer will filter expired challenges
  // regularly, so long as someone has an active challenge.
  // The edge case where every active challenger simultaneously
  // leaves the app without cancelling the challenge is not covered.

  // TODO: The challengeSyncer should force a resync at time
  //   max(activeChallenges.map((c) => c.expiresAt)

  yield fork(
    reduxSagaFirebase.database.sync,
    'challenges',
    {
      successActionCreator: lobbyActions.syncChallenges,
      transform: challengeTransformer,
    },
    'value',
  );
}
