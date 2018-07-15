import { delay } from 'redux-saga';
import { put, takeEvery, select } from 'redux-saga/effects';
import { types, messageReceived, eventReceived } from '../actions';
import { getApplicationState } from '../store';

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
  if (state.type === "WaitForBlockchainDeploy" || state.type === "WaitForBToDeposit") {
    yield delay(2000);
    yield put(eventReceived("blah"));
  }
}

export default function* rootSaga() {
  yield takeEvery('*', blockchainResponseFaker);
  yield takeEvery('*', messageSender);
}