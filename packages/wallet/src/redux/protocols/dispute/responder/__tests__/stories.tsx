import {addStoriesFromScenario as addStories} from "../../../../../__stories__";
import {Dispute} from "../../container";

import * as scenarios from "./scenarios";

addStories(
  scenarios.respondWithExistingStateHappyPath,
  "Dispute Responder / Respond with Existing Move",
  Dispute
);
addStories(
  scenarios.requireResponseHappyPath,
  "Dispute Responder / Requires new Response",
  Dispute
);
addStories(scenarios.refuteHappyPath, "Dispute Responder / Refute challenge", Dispute);
addStories(scenarios.challengeExpires, "Dispute Responder / Challenge Expires", Dispute);
addStories(
  scenarios.challengeExpiresDuringWaitForTransaction,
  "Dispute Responder / Challenge Expires during WaitForTransaction",
  Dispute
);
addStories(
  scenarios.challengeExpiresDuringWaitForApproval,
  "Dispute Responder / Challenge Expires during WaitForApproval",
  Dispute
);
