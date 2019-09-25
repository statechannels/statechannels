import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { FundingStrategyNegotiation } from '../container';

addStories(
  scenarios.indirectStrategyChosen,
  'FundingStrategyNegotiation / Player B / Indirect Strategy Chosen',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.virtualStrategyChosen,
  'FundingStrategyNegotiation / Player B / Virtual Strategy Chosen',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.rejectedStrategy,
  'FundingStrategyNegotiation / Player B / Rejected strategy',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.cancelledByUser,
  'FundingStrategyNegotiation / Player B / Cancelled by user',
  FundingStrategyNegotiation,
);
addStories(
  scenarios.cancelledByOpponent,
  'FundingStrategyNegotiation / Player B / Cancelled by opponent',
  FundingStrategyNegotiation,
);
