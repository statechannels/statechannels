import { call, put } from 'redux-saga/effects';
import * as actions from '../actions';
import { ethers } from 'ethers';
import { getProvider } from '../../utils/contract-utils';
import { TransactionResponse } from 'ethers/providers';
import { QueuedTransaction } from '../outbox';
import { ADJUDICATOR_ADDRESS } from '../../constants';

export function* transactionSender(transaction: QueuedTransaction) {
  const provider: ethers.providers.JsonRpcProvider = yield call(getProvider);
  const signer = provider.getSigner();
  const { processId } = transaction;
  yield put(actions.transactionSent(processId));
  let transactionResult: TransactionResponse;
  try {
    transactionResult = yield call([signer, signer.sendTransaction], {
      ...transaction.transactionRequest,
      to: ADJUDICATOR_ADDRESS,
    });
  } catch (err) {
    yield put(actions.transactionSubmissionFailed(processId, err));
    return;
  }
  yield put(
    actions.transactionSubmitted(processId, transactionResult.hash ? transactionResult.hash : ''),
  );
  const confirmedTransaction = yield call([transactionResult, transactionResult.wait]);
  yield put(actions.transactionConfirmed(processId, confirmedTransaction.contractAddress));
  // TODO: Figure out how to wait for a transaction to be X blocks deep
  // yield call(transactionResult.wait, 5);
  yield put(actions.transactionFinalized(processId));
}
