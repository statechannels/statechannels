import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { ConsensusUpdate } from '../container';

addStories(
  scenarios.twoPlayerAHappyPath,
  'Consensus Update /Two Player Player A Happy Path',
  ConsensusUpdate,
);
addStories(
  scenarios.twoPlayerBHappyPath,
  'Consensus Update /Two Player Player B Happy Path',
  ConsensusUpdate,
);
