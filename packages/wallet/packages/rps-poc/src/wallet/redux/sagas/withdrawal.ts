import * as blockchainActions from '../actions/blockchain';
import { put, take, actionChannel, } from 'redux-saga/effects';

export function* withdrawalSaga(playerAddress: string) {
  const channel = yield actionChannel([
    blockchainActions.WITHDRAW_SUCCESS,
    blockchainActions.WITHDRAW_FAILURE
  ]);

  yield put(blockchainActions.withdrawRequest(playerAddress));
  const { transaction, reason: failureReason } = yield take(channel);

  return { transaction, failureReason };
}