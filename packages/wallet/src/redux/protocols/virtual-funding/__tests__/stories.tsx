import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { VirtualFunding } from '../container';

addStories(scenarios.happyPath, 'Virtual Funding/ Happy Path', VirtualFunding);
