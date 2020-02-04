import {call, put} from "redux-saga/effects";

import {TransactionResponse, JsonRpcProvider} from "ethers/providers";

import * as actions from "../actions";
import {getProvider} from "../../utils/contract-utils";
import {QueuedTransaction} from "../outbox";

export function* transactionSender(transaction: QueuedTransaction) {
  const provider: JsonRpcProvider = yield call(getProvider);
  const signer = yield call([provider, provider.getSigner]);
  const {processId} = transaction;
  yield put(actions.transactionSent({processId}));
  let transactionResult: TransactionResponse;
  try {
    transactionResult = yield call(
      [signer, signer.sendTransaction],
      transaction.transactionRequest
    );
  } catch (error) {
    console.error(error);
    yield put(actions.transactionSubmissionFailed({processId, error}));
    return;
  }
  const transactionHash = transactionResult.hash ? transactionResult.hash : "";
  yield put(actions.transactionSubmitted({processId, transactionHash}));
  const confirmedTransaction = yield call([transactionResult, transactionResult.wait]);
  yield put(
    actions.transactionConfirmed({
      processId,
      contractAddress: confirmedTransaction.contractAddress
    })
  );
}
