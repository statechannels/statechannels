import { delay } from 'redux-saga';
import {
  put, takeEvery, select, fork,
} from 'redux-saga/effects';
import * as playerAStates from '../../game-engine/application-states/PlayerA';
import { GameAction, GameActionType } from '../actions/game';
import opponentSaga from './opponents';
import loginSaga from './login';
import messageSaga from './messages';
import { getApplicationState } from '../store';
import autoOpponentSaga from './auto-opponent';
import { walletSaga } from '../../wallet/sagas/wallet';

function* blockchainResponseFaker() {
  const state = yield select(getApplicationState);
  if (state == null) { return false; }
  if (state instanceof playerAStates.WaitForBlockchainDeploy || state instanceof playerAStates.WaitForBToDeposit) {
    yield delay(2000);
    yield put(GameAction.eventReceived({}));
  }
}

export default function* rootSaga() {
  yield fork(opponentSaga);
  yield fork(walletSaga);
  yield fork(loginSaga);
  yield fork(messageSaga);  
  yield fork(autoOpponentSaga);
  yield takeEvery(GameActionType.STATE_CHANGED, blockchainResponseFaker);
}
