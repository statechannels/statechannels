import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Dispute } from '../../container';

addStories(scenarios.opponentResponds, 'Challenging / Opponent responds', Dispute);
addStories(scenarios.challengeTimesOutAndIsDefunded, 'Challenging / Challenge times out', Dispute);
addStories(scenarios.channelDoesntExist, "Challenging / Channel doesn't exist", Dispute);
addStories(scenarios.channelNotFullyOpen, 'Challenging / Channel not fully open', Dispute);
addStories(scenarios.alreadyHaveLatest, 'Challenging / Already have latest state', Dispute);
addStories(scenarios.userDeclinesChallenge, 'Challenging / User declines challenge', Dispute);
addStories(scenarios.transactionFails, 'Challenging / Transaction fails', Dispute);
