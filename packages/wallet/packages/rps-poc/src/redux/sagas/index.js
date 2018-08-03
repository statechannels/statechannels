import { delay } from 'redux-saga';
import {
  put, takeEvery, select, fork, call,
} from 'redux-saga/effects';
import { types as playerAStates } from '../../game-engine/application-states/PlayerA';
import {
  types, messageReceived, eventReceived, messageSent,
} from '../actions/game';
import opponentSaga from './opponents';
import loginSaga from './login';
import messageSaga from './messages';
import { getApplicationState } from '../store';
import { reduxSagaFirebase } from '../../gateways/firebase';

function* opponentResponseFaker() {
  yield delay(2000);
  yield put(messageReceived("blah"));
}

function* messageSender() {
  let state = yield select(getApplicationState);
  if (state.shouldSendMessage) {
    yield delay(2000);  // for dev purposes
    yield put(messageSent(state.message));
    // push to firebase messages - organized by channel ID
    yield call(reduxSagaFirebase.create, `messages.${state.channel}`, {
      message: JSON.stringify(state.message),
    });
    yield opponentResponseFaker();
  }
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
  yield fork(messageSaga);
  yield takeEvery('*', blockchainResponseFaker);
  yield takeEvery(types.MESSAGE_SENT, messageSender);
}
