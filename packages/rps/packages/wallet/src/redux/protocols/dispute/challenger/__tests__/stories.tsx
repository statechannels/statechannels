import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

addStories(scenarios.opponentResponds, 'Challenging / Opponent responds');
addStories(scenarios.challengeTimesOutAndIsDefunded, 'Challenging / Challenge times out');
addStories(scenarios.channelDoesntExist, "Challenging / Channel doesn't exist");
addStories(scenarios.channelNotFullyOpen, 'Challenging / Channel not fully open');
addStories(scenarios.alreadyHaveLatest, 'Challenging / Already have latest state');
addStories(scenarios.userDeclinesChallenge, 'Challenging / User declines challenge');
addStories(scenarios.transactionFails, 'Challenging / Transaction fails');
