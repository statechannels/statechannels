import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';

addStories(scenarios.aHappyPath, 'Consensus Update / Player A Happy Path');
addStories(scenarios.bHappyPath, 'Consensus Update / Player B Happy Path');
