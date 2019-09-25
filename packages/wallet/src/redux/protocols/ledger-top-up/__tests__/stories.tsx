import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import * as scenarios from './scenarios';
import { LedgerTopUp } from '../container';

addStories(scenarios.playerAHappyPath, 'Ledger Top Up / Player A Happy Path', LedgerTopUp);
