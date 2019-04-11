import { call, put } from 'redux-saga/effects';
import * as actions from '../actions';
import { ethers } from 'ethers';
import { getProvider, getAdjudicatorContractAddress } from '../../utils/contract-utils';
import { TransactionResponse, TransactionRequest } from 'ethers/providers';
import { WalletProtocol } from '../types';

export function* transactionSender(
  transaction: TransactionRequest,
  channelId: string,
  protocol: WalletProtocol,
) {
  const provider: ethers.providers.JsonRpcProvider = yield call(getProvider);
  const signer = provider.getSigner();
  yield put(actions.transactionSentToMetamask(channelId, protocol));
  let transactionResult: TransactionResponse;
  try {
    const contractAddress = yield call(getAdjudicatorContractAddress, provider);
    transactionResult = yield call([signer, signer.sendTransaction], {
      ...transaction,
      to: contractAddress,
    });
  } catch (err) {
    yield put(actions.transactionSubmissionFailed(channelId, protocol, err));
    return;
  }
  yield put(
    actions.transactionSubmitted(
      channelId,
      protocol,
      transactionResult.hash ? transactionResult.hash : '',
    ),
  );
  const confirmedTransaction = yield call([transactionResult, transactionResult.wait]);
  yield put(
    actions.transactionConfirmed(channelId, protocol, confirmedTransaction.contractAddress),
  );
  // TODO: Figure out how to wait for a transaction to be X blocks deep
  // yield call(transactionResult.wait, 5);
  yield put(actions.transactionFinalized(channelId, protocol));
}
