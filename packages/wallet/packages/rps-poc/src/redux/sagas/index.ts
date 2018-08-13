import { delay } from 'redux-saga';
import {
  put, takeEvery, select, fork, call,
} from 'redux-saga/effects';
import * as playerAStates from '../../game-engine/application-states/PlayerA';
import { GameActionType, GameAction } from '../actions/game';
import opponentSaga from './opponents';
import loginSaga from './login';
import messageSaga from './messages';
import { getApplicationState } from '../store';
import { reduxSagaFirebase } from '../../gateways/firebase';
import Message from '../../game-engine/Message';

function* opponentResponseFaker() {
  yield delay(2000);
  yield put(GameAction.messageReceived(new Message('blah', 'sig')));
}

function* messageSender() {
  const state = yield select(getApplicationState);
  if (state.shouldSendMessage) {
    yield delay(2000);  // for dev purposes
    yield put(GameAction.moveSent(state.move));
    // push to firebase messages - organized by channel ID
    yield call(reduxSagaFirebase.database.create, `messages/${state.channelId}`, {
      message: JSON.stringify(state.move),
    });
    yield opponentResponseFaker();
  }
}

function* blockchainResponseFaker() {
  const state = yield select(getApplicationState);
  if (state == null) { return false; }
  if (state.type === playerAStates.WaitForBlockchainDeploy || state.type === playerAStates.WaitForBToDeposit) {
    yield delay(2000);
    yield put(GameAction.eventReceived(new Message('blah', 'sig')));
  }
}

export default function* rootSaga() {
  yield fork(opponentSaga);
  yield fork(loginSaga);
  yield fork(messageSaga);
  yield takeEvery('*', blockchainResponseFaker);
  yield takeEvery(GameActionType.STATE_CHANGED, messageSender);
}
