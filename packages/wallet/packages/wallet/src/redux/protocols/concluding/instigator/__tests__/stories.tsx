import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import * as scenarios from './scenarios';

addStories(scenarios.happyPath, 'Concluding / Instigator / Happy Path');
addStories(scenarios.channelDoesntExist, 'Concluding / Instigator / Channel doesnt exist');
addStories(scenarios.concludingNotPossible, 'Concluding / Instigator / Concluding impossible');
