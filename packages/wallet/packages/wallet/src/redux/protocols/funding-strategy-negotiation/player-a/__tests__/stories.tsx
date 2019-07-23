import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { FundingStrategyNegotiation } from '../container';

addStories(
  scenarios.indirectStrategyChosen,
  'FundingStrategyNegotiation / Player A / Indirect strategy chosen',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.rejectedStrategy,
  'FundingStrategyNegotiation / Player A / Rejected strategy',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.cancelledByUser,
  'FundingStrategyNegotiation / Player A / Cancelled by user',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.cancelledByOpponent,
  'FundingStrategyNegotiation / Player A / Cancelled by opponent',
  FundingStrategyNegotiation,
);
