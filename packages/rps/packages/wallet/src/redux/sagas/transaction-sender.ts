import { call, put } from 'redux-saga/effects';
import * as actions from '../actions';
import { ethers } from 'ethers';
import { getProvider, getAdjudicatorContractAddress } from '../../utils/contract-utils';
import { TransactionResponse } from 'ethers/providers';

export function* transactionSender(transaction, channelId) {
  const provider: ethers.providers.JsonRpcProvider = yield call(getProvider);
  const signer = provider.getSigner();
  yield put(actions.transactionSentToMetamask(channelId));
  let transactionResult: TransactionResponse;
  try {
    const contractAddress = yield call(getAdjudicatorContractAddress, provider);
    transactionResult = yield call([signer, signer.sendTransaction], {
      ...transaction,
      to: contractAddress,
    });
  } catch (err) {
    yield put(actions.transactionSubmissionFailed(channelId, err));
    return;
  }
  yield put(
    actions.transactionSubmitted(channelId, transactionResult.hash ? transactionResult.hash : ''),
  );
  const confirmedTransaction = yield call([transactionResult, transactionResult.wait]);
  yield put(actions.transactionConfirmed(channelId, confirmedTransaction.contractAddress));
  // TODO: Figure out how to wait for a transaction to be X blocks deep
  // yield call(transactionResult.wait, 5);
  yield put(actions.transactionFinalized());
}
