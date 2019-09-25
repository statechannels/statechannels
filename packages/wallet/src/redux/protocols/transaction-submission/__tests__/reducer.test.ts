import * as scenarios from './scenarios';
import { transactionReducer as reducer, initialize, ReturnVal } from '../reducer';
import { TransactionRequest } from 'ethers/providers';
import * as states from '../states';

describe('happy-path scenario', () => {
  const scenario = scenarios.happyPath;
  const storage = scenario.sharedData;

  describe('when initializing', () => {
    const { transaction, processId, channelId } = scenario;
    const result = initialize(transaction, processId, channelId, storage);

    itTransitionsTo(result, 'TransactionSubmission.WaitForSend');
    itQueuesATransaction(result, transaction, processId);
  });

  describe('when in WaitForSend', () => {
    const { state, action } = scenario.waitForSend;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.WaitForSubmission');
  });

  describe('when in WaitForSubmission', () => {
    const { state, action } = scenario.waitForSubmission;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.WaitForConfirmation');
  });

  describe('when in WaitForConfirmation', () => {
    const { state, action } = scenario.waitForConfirmation;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.Success');
  });
});

describe('retry-and-approve scenario', () => {
  const scenario = scenarios.retryAndApprove;
  const storage = scenario.sharedData;

  describe('when in WaitForSubmission', () => {
    const { state, action } = scenario.waitForSubmission;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.ApproveRetry');
  });

  describe('when in ApproveRetry', () => {
    const { state, action } = scenario.approveRetry;
    const result = reducer(state, storage, action);
    const { transaction, processId } = scenario;

    itTransitionsTo(result, 'TransactionSubmission.WaitForSend');
    itQueuesATransaction(result, transaction, processId);

    // it increases the retry count
  });
});

describe('retry-and-deny scenario', () => {
  const scenario = scenarios.retryAndDeny;
  const storage = scenario.sharedData;

  describe('when in WaitForSubmission', () => {
    const { state, action } = scenario.waitForSubmission;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.ApproveRetry');
  });

  describe('when in ApproveRetry', () => {
    const { state, action } = scenario.approveRetry;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.Failure');
    // it sets the failure reason to ...
  });
});

describe('transaction-failed scenario', () => {
  const scenario = scenarios.transactionFailed;
  const storage = scenario.sharedData;

  describe('when in ApproveRetry', () => {
    const { state, action } = scenario.waitForConfirmation;
    const result = reducer(state, storage, action);

    itTransitionsTo(result, 'TransactionSubmission.Failure');
    // it sets the failure reason to ...
  });
});

function itTransitionsTo(result: ReturnVal, type: states.TransactionSubmissionStateType) {
  it(`transitions to ${type}`, () => {
    expect(result.state.type).toEqual(type);
  });
}

function itQueuesATransaction(
  result: ReturnVal,
  transactionRequest: TransactionRequest,
  processId: string,
) {
  it('queues a transaction', () => {
    const queuedTransaction = result.storage.outboxState.transactionOutbox[0];
    expect(queuedTransaction).toEqual({ transactionRequest, processId });
  });
}
