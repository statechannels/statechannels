import * as states from '../states';
import * as actions from '../actions';
import { EMPTY_SHARED_DATA } from '../../../state';

// ---------
// Test data
// ---------
const transaction = {};
const processId = 'process-id.123';
const transactionHash = 'transaction-hash.123';
const sharedData = EMPTY_SHARED_DATA;

const props = { transaction, processId, transactionHash, sharedData, channelId: '0xChannel' };

// ------
// States
// ------
const waitForSend = states.waitForSend(props);
const waitForSubmission = states.waitForSubmission(props);
const waitForSend2 = states.waitForSubmission(props);
const waitForConfirmation = states.waitForConfirmation(props);
const success = states.success({});
const approveRetry = states.approveRetry(props);
const failure = states.failure('UserDeclinedRetry');
const failure2 = states.failure('TransactionFailed');

// -------
// Actions
// -------
const sent = actions.transactionSent({ processId });
const submitted = actions.transactionSubmitted({ processId, transactionHash });
const submissionFailed = actions.transactionSubmissionFailed({
  processId,
  error: {
    message: 'Insufficient funds',
    code: 123,
  },
});
const confirmed = actions.transactionConfirmed({ processId });
const retryApproved = actions.transactionRetryApproved({ processId });
const retryDenied = actions.transactionRetryDenied({ processId });
const failed = actions.transactionFailed({ processId });

// ---------
// Scenarios
// ---------
export const happyPath = {
  ...props,
  waitForSend: {
    state: waitForSend,
    action: sent,
  },
  waitForSubmission: {
    state: waitForSubmission,
    action: submitted,
  },
  waitForConfirmation: {
    state: waitForConfirmation,
    action: confirmed,
  },
  success,
};

export const retryAndApprove = {
  ...props,
  // States
  waitForSubmission: {
    state: waitForSubmission,
    action: submissionFailed,
  },
  approveRetry: {
    state: approveRetry,
    action: retryApproved,
  },
  waitForSend2: {
    state: waitForSend2,
  },
};

export const retryAndDeny = {
  ...props,
  waitForSubmission: {
    state: waitForSubmission,
    action: submissionFailed,
  },
  approveRetry: {
    state: approveRetry,
    action: retryDenied,
  },
  failure,
};

export const transactionFailed = {
  ...props,
  waitForConfirmation: {
    state: waitForConfirmation,
    action: failed,
  },
  failure2,
};
