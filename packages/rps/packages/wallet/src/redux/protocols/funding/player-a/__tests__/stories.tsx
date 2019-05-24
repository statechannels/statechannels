import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(scenarios.happyPath, 'Funding / Player A / Happy path');
addStories(scenarios.rejectedStrategy, 'Funding / Player A / Rejected strategy');
addStories(scenarios.cancelledByUser, 'Funding / Player A / Cancelled by user');
addStories(scenarios.cancelledByOpponent, 'Funding / Player A / Cancelled by opponent');
