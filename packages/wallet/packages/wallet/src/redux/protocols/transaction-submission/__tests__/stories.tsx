import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { TransactionSubmission } from '../container';

addStories(scenarios.happyPath, 'Transaction Submission / Happy path', TransactionSubmission);
addStories(
  scenarios.retryAndApprove,
  'Transaction Submission / User approves retry',
  TransactionSubmission,
);
addStories(
  scenarios.retryAndDeny,
  'Transaction Submission / User denies retry',
  TransactionSubmission,
);
addStories(
  scenarios.transactionFailed,
  'Transaction Submission / Transaction fails',
  TransactionSubmission,
);
