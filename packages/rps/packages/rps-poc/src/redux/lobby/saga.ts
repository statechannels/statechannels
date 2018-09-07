import { fork, put, take, actionChannel } from 'redux-saga/effects'; 

import { reduxSagaFirebase } from '../../gateways/firebase';

import * as lobbyActions from './actions';
import * as applicationActions from '../application/actions';

import GameEngineA from '../../game-engine/GameEngineA';

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
          balances: [ 3 * action.stake, 3 * action.stake ],
        })
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
};

// maps { '0xabc': challenge1Data, ... } to [challenge1Data, ....]
const challengeTransformer = (dict) => Object.keys(dict.value).map((key) => dict.value[key]);

function * challengeSyncer() {
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

