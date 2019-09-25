import * as scenarios from './scenarios';

import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { DirectFunding } from '../container';

addStories(scenarios.aHappyPath, 'Direct Funding / PlayerA / Happy Path', DirectFunding);
