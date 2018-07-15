import { delay } from 'redux-saga';
import { put, takeEvery, select } from 'redux-saga/effects';
import { types, messageReceived, eventReceived } from '../actions';
import { getApplicationState } from '../store';
import { types as playerAStates } from '../../game-engine/application-states/ApplicationStatesPlayerA';

function* messageSender() {
  let state = yield select();
  if (state.message) {
    // todo put the message sending logic here
    yield opponentResponseFaker();
  }
}

function* opponentResponseFaker() {
  yield delay(2000);
  yield put(messageReceived("blah"));
}


function* blockchainResponseFaker() {
  let state = yield select();
  if (state.type === playerAStates.WaitForBlockchainDeploy || state.type === playerAStates.WaitForBToDeposit) {
    yield delay(2000);
    yield put(eventReceived("blah"));
  }
}

export default function* rootSaga() {
  yield takeEvery('*', blockchainResponseFaker);
  yield takeEvery('*', messageSender);
}