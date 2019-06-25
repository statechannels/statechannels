import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';

addStories(scenarios.twoPlayerAHappyPath, 'Consensus Update /Two Player Player A Happy Path');
addStories(scenarios.twoPlayerBHappyPath, 'Consensus Update /Two Player Player B Happy Path');
