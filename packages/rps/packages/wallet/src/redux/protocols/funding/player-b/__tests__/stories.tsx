import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Funding } from '../../container';

addStories(scenarios.happyPath, 'Funding / Player B / Happy path', Funding);
addStories(scenarios.rejectedStrategy, 'Funding / Player B / Rejected strategy', Funding);
addStories(scenarios.cancelledByUser, 'Funding / Player B / Cancelled by user', Funding);
addStories(scenarios.cancelledByOpponent, 'Funding / Player B / Cancelled by opponent', Funding);
