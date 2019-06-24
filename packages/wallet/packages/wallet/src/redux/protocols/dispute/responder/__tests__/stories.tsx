import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(
  scenarios.respondWithExistingCommitmentHappyPath,
  'Responding / Respond with Existing Move',
);
addStories(scenarios.requireResponseHappyPath, 'Responding / Requires new Response');
addStories(scenarios.refuteHappyPath, 'Responding / Refute challenge');
addStories(scenarios.challengeExpires, 'Responding / Challenge Expires');
addStories(
  scenarios.challengeExpiresDuringWaitForTransaction,
  'Responding / Challenge Expires during WaitForTransaction',
);
addStories(
  scenarios.challengeExpiresDuringWaitForApproval,
  'Responding / Challenge Expires during WaitForApproval',
);
