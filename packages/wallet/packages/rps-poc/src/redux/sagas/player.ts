import { delay } from 'redux-saga';
import { call } from 'redux-saga/effects';

import { default as firebase, reduxSagaFirebase } from '../../gateways/firebase';

export function* fetchOrCreatePlayer(address: string | undefined, defaultName="") {
  if (!address) { return null; }

  let player = yield fetchPlayer(address);

  if (!player) {
    yield createPlayer(address, defaultName);
    // fetch again instead of using return val, just in case another player was created in the interim
    player = yield fetchPlayer(address);
  }

  return player;
}

const playerRef = (address: string) => {
  return firebase.database().ref(`players/${address}`);
}

function* fetchPlayer(address) {
  const query = playerRef(address);

  return yield call(reduxSagaFirebase.database.read, query);
}

function* createPlayer(address: string, defaultName: string) {
  const playerParams = {
    name: defaultName,
    address: address,
    lastSeen: new Date().getTime(),
  }

  return yield call(reduxSagaFirebase.database.update, playerRef(address), playerParams);
}

function * setLastSeen(address: string) {
  const playerParams = {
    lastSeen: new Date().getTime(),
  }

  return yield call(reduxSagaFirebase.database.patch, playerRef(address), playerParams);
}

export function * playerHeartbeatSaga(address: string) {
  while(true) {
    yield call(delay, 5000);
    yield setLastSeen(address);
  }
}
