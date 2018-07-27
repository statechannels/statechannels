import { delay } from 'redux-saga';
import { types as playerAStates } from '../../game-engine/application-states/ApplicationStatesPlayerA';
import { put, takeEvery, select, fork } from 'redux-saga/effects';
import { messageReceived, eventReceived, messageSent } from '../actions/game';
import opponentSaga from './opponents';
import loginSaga from './login';
import { getApplicationState } from '../store';

function* messageSender() {
  let state = yield select(getApplicationState);
  if (state.shouldSendMessage) {
    yield delay(2000);  // for dev purposes
    yield put(messageSent(state.message));
    // todo put the message sending logic here
    yield opponentResponseFaker();
  }
}

function* opponentResponseFaker() {
  yield delay(2000);
  yield put(messageReceived("blah"));
}


function* blockchainResponseFaker() {
  let state = yield select(getApplicationState);
  if (state.type === playerAStates.WaitForBlockchainDeploy || state.type === playerAStates.WaitForBToDeposit) {
    yield delay(2000);
    yield put(eventReceived("blah"));
  }
}

export default function* rootSaga() {
  yield fork(opponentSaga);
  yield fork(loginSaga);
  yield takeEvery('*', blockchainResponseFaker);
  yield takeEvery('*', messageSender);
}
