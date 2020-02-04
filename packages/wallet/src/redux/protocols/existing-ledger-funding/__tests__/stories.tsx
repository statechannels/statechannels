import {addStoriesFromScenario as addStories} from "../../../../__stories__";

import {ExistingLedgerFunding} from "../container";

import * as scenarios from "./scenarios";

addStories(
  scenarios.playerAFullyFundedHappyPath,
  "Existing Ledger Funding / Player A Fully Funded Happy Path",
  ExistingLedgerFunding
);
addStories(
  scenarios.playerATopUpNeeded,
  "Existing Ledger Funding / Player A Top-up needed",
  ExistingLedgerFunding
);
