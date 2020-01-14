import {fork, take, select, cancel, call, apply, put} from 'redux-saga/effects';

export const getLocalState = (storeObj: any) => storeObj.game.localState;
function getOpenGame(storObj: any, address: string) {
  return storObj.openGames.filter(game => (game.address = address))[0];
}

import {default as firebase, reduxSagaFirebase} from '../../gateways/firebase';

import * as actions from './actions';

import {LocalState} from '../game/state';
import {bigNumberify} from 'ethers/utils';
import {gameJoined} from '../game/actions';

export default function* openGameSaga() {
  // could be more efficient by only watching actions that could change the state
  // this is more robust though, so stick to watching all actions for the time being
  let openGameSyncerProcess: any = null;
  let myGameIsOnFirebase = false;
  let joinedAGame = false;

  while (true) {
    yield take('*');

    const localState: LocalState = yield select(getLocalState);

    if (localState.type === 'Setup.Lobby' || localState.type === 'B.WaitingRoom') {
      // if we're in the lobby we need to sync openGames
      if (!openGameSyncerProcess || !openGameSyncerProcess.isRunning()) {
        openGameSyncerProcess = yield fork(openGameSyncer);
      }
    } else {
      // if we're not in the lobby, we shouldn't be syncing openGames
      if (openGameSyncerProcess) {
        yield cancel(openGameSyncerProcess);
      }
    }

    if (localState.type === 'A.GameChosen' && !joinedAGame) {
      const openGameKey = `/challenges/${localState.opponentAddress}`;
      const taggedOpenGame = {
        isPublic: false,
        playerAName: localState.name,
        playerAOutcomeAddress: localState.outcomeAddress,
      };
      yield call(reduxSagaFirebase.database.patch, openGameKey, taggedOpenGame);
      joinedAGame = true;
    }

    if (localState.type === 'B.WaitingRoom') {
      // if we don't have a wallet address, something's gone very wrong
      const {address} = localState;
      let myOpenGame;
      if (address) {
        const myOpenGameKey = `/challenges/${address}`;

        if (!myGameIsOnFirebase) {
          // my game isn't on firebase (as far as the app knows)
          // attempt to put the game on firebase - will be a no-op if already there

          myOpenGame = {
            address,
            outcomeAddress: localState.outcomeAddress,
            name: localState.name,
            stake: localState.roundBuyIn.toString(),
            createdAt: new Date().getTime(),
            isPublic: true,
            playerAName: 'unknown',
            playerAOutcomeAddress: 'unknown',
          };

          const disconnect = firebase
            .database()
            .ref(myOpenGameKey)
            .onDisconnect();
          yield apply(disconnect, disconnect.remove, []);
          // use update to allow us to pick our own key
          yield call(reduxSagaFirebase.database.update, myOpenGameKey, myOpenGame);
          myGameIsOnFirebase = true;
        } else {
          const storeObj = yield select();
          myOpenGame = getOpenGame(storeObj, myOpenGameKey);
          if (myOpenGame && !myOpenGame.isPublic) {
            yield put(
              gameJoined(
                myOpenGame.playerAName,
                myOpenGame.opponentAddress,
                myOpenGame.playerAOutcomeAddress
              )
            );
            yield call(reduxSagaFirebase.database.delete, myOpenGameKey);
            myGameIsOnFirebase = false;
          }
        }
      }
    }
    if (localState.type === 'Setup.Lobby' && myGameIsOnFirebase && localState.address) {
      // we cancelled our game
      const myOpenGameKey = `/challenges/${localState.address}`;
      yield call(reduxSagaFirebase.database.delete, myOpenGameKey);
      myGameIsOnFirebase = false;
    }
  }
}
// maps { '0xabc': openGame1Data, ... } to [openGame1Data, ....]
const openGameTransformer = dict => {
  if (!dict.value) {
    return [];
  }
  const allGames = Object.keys(dict.value).map(key => {
    // Convert to a proper BN hex string
    dict.value[key].stake = bigNumberify(dict.value[key].stake).toHexString();
    return dict.value[key];
  });

  return allGames;
};

function* openGameSyncer() {
  yield fork(
    reduxSagaFirebase.database.sync,
    'challenges',
    {
      successActionCreator: actions.syncOpenGames,
      transform: openGameTransformer,
    },
    'value'
  );
}
