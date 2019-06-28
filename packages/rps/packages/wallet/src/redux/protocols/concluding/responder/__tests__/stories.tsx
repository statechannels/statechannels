import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(scenarios.happyPath, 'Concluding / Responder / Happy Path');
addStories(scenarios.channelDoesntExist, 'Concluding / Responder / Channel doesnt exist');
addStories(scenarios.concludingNotPossible, 'Concluding / Responder / Concluding impossible');
