import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Concluding } from '../../container';

addStories(scenarios.happyPath, 'Concluding / Responder / Happy Path', Concluding);
addStories(
  scenarios.channelDoesntExist,
  'Concluding / Responder / Channel doesnt exist',
  Concluding,
);
addStories(
  scenarios.concludingNotPossible,
  'Concluding / Responder / Concluding impossible',
  Concluding,
);
