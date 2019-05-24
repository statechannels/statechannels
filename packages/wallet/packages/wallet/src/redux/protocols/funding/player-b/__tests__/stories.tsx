import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(scenarios.happyPath, 'Funding / Player B / Happy path');
addStories(scenarios.rejectedStrategy, 'Funding / Player B / Rejected strategy');
addStories(scenarios.cancelledByUser, 'Funding / Player B / Cancelled by user');
addStories(scenarios.cancelledByOpponent, 'Funding / Player B / Cancelled by opponent');
