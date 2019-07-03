import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Funding } from '../../container';

addStories(scenarios.happyPath, 'Funding / Player A / Happy path', Funding);
addStories(scenarios.rejectedStrategy, 'Funding / Player A / Rejected strategy', Funding);
addStories(scenarios.cancelledByUser, 'Funding / Player A / Cancelled by user', Funding);
addStories(scenarios.cancelledByOpponent, 'Funding / Player A / Cancelled by opponent', Funding);
