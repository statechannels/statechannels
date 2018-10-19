import { fork, put, take, actionChannel, cps, } from 'redux-saga/effects';

import { reduxSagaFirebase } from '../../gateways/firebase';

import * as lobbyActions from './actions';
import * as applicationActions from '../application/actions';

import GameEngineA from '../../game-engine/GameEngineA';
import BN from 'bn.js';

// @ts-ignore
import RPSGameArtifact from '../../../contracts/RockPaperScissorsGame.sol';
const DEFAULT_BALANCES = 50;

export default function* lobbySaga(address: string) {
  yield put(applicationActions.lobbySuccess());
  // subscribe to challenges
  yield* challengeSyncer();

  const channel = yield actionChannel([
    lobbyActions.ACCEPT_CHALLENGE,
    lobbyActions.CREATE_CHALLENGE,
  ]);

  while (true) {
    const action: lobbyActions.AnyAction = yield take(channel);
    switch (action.type) {
      case lobbyActions.ACCEPT_CHALLENGE:
        const libraryAddress = yield getLibraryAddress();
        const gameEngine = GameEngineA.setupGame({
          me: address,
          opponent: action.address,
          stake: action.stake,
          libraryAddress,
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
  });
};

function* challengeSyncer() {
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
// TODO: This should be moved somewhere else
function* getLibraryAddress() {
  const selectedNetworkId = parseInt(yield cps(web3.version.getNetwork), 10);
  return RPSGameArtifact.networks[selectedNetworkId].address;
}

