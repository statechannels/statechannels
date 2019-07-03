import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import * as scenarios from './scenarios';
import { ExistingLedgerFunding } from '../container';

addStories(
  scenarios.playerAFullyFundedHappyPath,
  'Existing Ledger Funding / Player A Fully Funded Happy Path',
  ExistingLedgerFunding,
);
addStories(
  scenarios.playerATopUpNeeded,
  'Existing Ledger Funding / Player A Top-up needed',
  ExistingLedgerFunding,
);
