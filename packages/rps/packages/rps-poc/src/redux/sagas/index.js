import { delay } from 'redux-saga';
import { put, takeEvery } from 'redux-saga/effects';
import { types, messageReceived, eventReceived } from '../actions';

function* opponentResponseFaker() {
  yield delay(2000);
  yield put(messageReceived("blah"));
}

function* blockchainResponseFaker() {
  yield delay(2000);
  yield put(eventReceived("blah"));
}

export default function* rootSaga() {
  yield takeEvery(types.TRIGGER_FAKE_BLOCKCHAIN_RESPONSE, blockchainResponseFaker);
  yield takeEvery(types.TRIGGER_FAKE_OPPONENT_RESPONSE, opponentResponseFaker);
}