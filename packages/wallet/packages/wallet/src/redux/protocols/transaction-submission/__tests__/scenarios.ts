import * as states from '../states';
import * as actions from '../actions';
import { EMPTY_SHARED_DATA } from '../..';

// To test all paths through the state machine we will use 4 different scenarios:
//
// 1. Happy path: WaitForSend -> WaitForSubmission -> WaitForConfirmation -> Success
// 2. Retry and approve: WaitForSubmission -> ApproveRetry -> WaitForSend2
// 3. Retry and deny: WaitForSubmission -> ApprovedRetry -> Failure
// 4. Transaction failed: WaitForConfirmation -> Failure2

// ---------
// Test data
// ---------
const transaction = {};
const processId = 'process-id.123';
const transactionHash = 'transaction-hash.123';
const sharedData = EMPTY_SHARED_DATA;

const props = { transaction, processId, transactionHash, sharedData };

// ------
// States
// ------
const waitForSend = states.waitForSend(props);
const waitForSubmission = states.waitForSubmission(props);
const waitForSend2 = states.waitForSubmission(props);
const waitForConfirmation = states.waitForConfirmation(props);
const success = states.success();
const approveRetry = states.approveRetry(props);
const failure = states.failure('User refused');
const failure2 = states.failure('Transaction failed');

// -------
// Actions
// -------
const sent = actions.transactionSent(processId);
const submitted = actions.transactionSubmitted(processId, transactionHash);
const submissionFailed = actions.transactionSubmissionFailed(processId, {
  message: 'Insufficient funds',
  code: 123,
});
const confirmed = actions.transactionConfirmed(processId);
const retryApproved = actions.transactionRetryApproved(processId);
const retryDenied = actions.transactionRetryDenied(processId);
const failed = actions.transactionFailed(processId);

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  // States
  waitForSend,
  waitForSubmission,
  waitForConfirmation,
  success,
  // Actions
  sent,
  submitted,
  confirmed,
};

export const retryAndApprove = {
  ...props,
  // States
  waitForSubmission,
  approveRetry,
  waitForSend2,
  // Actions
  submissionFailed,
  retryApproved,
};

export const retryAndDeny = {
  ...props,
  // States
  waitForSubmission,
  approveRetry,
  failure,
  // Actions
  submissionFailed,
  retryDenied,
};

export const transactionFailed = {
  ...props,
  // States
  waitForConfirmation,
  failure2,
  // Actions
  failed,
};
