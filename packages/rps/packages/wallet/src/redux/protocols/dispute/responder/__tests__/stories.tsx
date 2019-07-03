import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Dispute } from '../../container';

addStories(
  scenarios.respondWithExistingCommitmentHappyPath,
  'Responding / Respond with Existing Move',
  Dispute,
);
addStories(scenarios.requireResponseHappyPath, 'Responding / Requires new Response', Dispute);
addStories(scenarios.refuteHappyPath, 'Responding / Refute challenge', Dispute);
addStories(scenarios.challengeExpires, 'Responding / Challenge Expires', Dispute);
addStories(
  scenarios.challengeExpiresDuringWaitForTransaction,
  'Responding / Challenge Expires during WaitForTransaction',
  Dispute,
);
addStories(
  scenarios.challengeExpiresDuringWaitForApproval,
  'Responding / Challenge Expires during WaitForApproval',
  Dispute,
);
