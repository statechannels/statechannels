import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import * as scenarios from './scenarios';
import { Concluding } from '../../container';

addStories(scenarios.happyPath, 'Concluding / Instigator / Happy Path', Concluding);
addStories(
  scenarios.channelDoesntExist,
  'Concluding / Instigator / Channel doesnt exist',
  Concluding,
);
addStories(
  scenarios.concludingNotPossible,
  'Concluding / Instigator / Concluding impossible',
  Concluding,
);
