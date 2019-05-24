import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(
  scenarios.respondWithExistingCommitmentHappyPath,
  'Responding / Respond with Existing Move',
);
addStories(scenarios.requireResponseHappyPath, 'Responding / Requires new Response');
addStories(scenarios.refuteHappyPath, 'Responding / Refute challenge');
addStories(scenarios.challengeExpiresChannelDefunded, 'Responding / Challenge Expires (Defunded)');
addStories(
  scenarios.challengeExpiresButChannelNotDefunded,
  'Responding / Challenge Expires (NOT Defunded)',
);
addStories(
  scenarios.challengeExpiresDuringWaitForTransaction,
  'Responding / Challenge Expires during WaitForTransaction',
);
addStories(
  scenarios.challengeExpiresDuringWaitForApproval,
  'Responding / Challenge Expires during WaitForApproval',
);
addStories(
  scenarios.defundActionComesDuringAcknowledgeTimeout,
  'Responding / Challenge Expires during AcknowledgeTimeout',
);
