import {fork, take, select, call, apply, put} from 'redux-saga/effects';

export const getLocalState = (storeObj: any) => storeObj.game.localState;
function getOpenGame(storObj: any, address: string) {
  return storObj.openGames.filter(game => (game.address = address))[0];
}

import {default as firebase, reduxSagaFirebase} from '../../gateways/firebase';

import * as actions from './actions';

import {LocalState} from '../game/state';
import {bigNumberify} from 'ethers/utils';
import {gameJoined} from '../game/actions';
import {FIREBASE_PREFIX} from '../../constants';

export default function* openGameSaga(address: string) {
  let myGameIsOnFirebase = false;
  const localState: LocalState = yield select(getLocalState);
  const myOpenGameKey = `/${FIREBASE_PREFIX}/challenges/${address}`;

  yield fork(openGameSyncer); // both Players
  yield fork(joinGameSaga); // player A

  // player B
  while (true) {
    const action = yield take('*');
    if (myGameIsOnFirebase) {
      myGameIsOnFirebase = yield deleteGameIfJoined(myOpenGameKey); // false if success
    } else if (action.type === 'CreateGame' && 'outcomeAddress' in localState) {
      const myPublicOpenGame = {
        address,
        outcomeAddress: localState.outcomeAddress,
        name: localState.name,
        stake: action.roundBuyIn.toString(),
        createdAt: new Date().getTime(),
        isPublic: true,
        playerAName: 'unknown',
        playerAOutcomeAddress: 'unknown',
      };
      myGameIsOnFirebase = yield putGameOnFirebase(myOpenGameKey, myPublicOpenGame); // true if success
    }

    if (action.type === 'CancelGame') {
      // we cancelled our game
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
    `/${FIREBASE_PREFIX}/challenges`,
    {
      successActionCreator: actions.syncOpenGames,
      transform: openGameTransformer,
    },
    'value'
  );
}

function* joinGameSaga() {
  while (true) {
    const action = yield take('JoinOpenGame');
    const localState: LocalState = yield select(getLocalState);
    if ('name' in localState && 'outcomeAddress' in localState) {
      const openGameKey = `/${FIREBASE_PREFIX}/challenges/${action.opponentAddress}`;
      const taggedOpenGame = {
        isPublic: false,
        playerAName: localState.name,
        playerAOutcomeAddress: localState.outcomeAddress,
      };
      yield call(reduxSagaFirebase.database.patch, openGameKey, taggedOpenGame);
    }
  }
}

function* putGameOnFirebase(myOpenGameKey: string, myOpenGame: any) {
  const disconnect = firebase
    .database()
    .ref(myOpenGameKey)
    .onDisconnect();
  yield apply(disconnect, disconnect.remove, []);
  // use update to allow us to pick our own key
  yield call(reduxSagaFirebase.database.update, myOpenGameKey, myOpenGame);
  return true; // myGmeIsOnFirebase mutex
}

function* deleteGameIfJoined(myOpenGameKey: string) {
  const storeObj = yield select();
  const myOpenGame = getOpenGame(storeObj, myOpenGameKey);
  if (myOpenGame && !myOpenGame.isPublic) {
    yield put(
      gameJoined(
        myOpenGame.playerAName,
        myOpenGame.opponentAddress,
        myOpenGame.playerAOutcomeAddress
      )
    );
    yield call(reduxSagaFirebase.database.delete, myOpenGameKey);
    return false; // myGameIsOnFirebase mutex
  }
  return true;
}
