import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { Dispute } from '../../container';

addStories(scenarios.opponentResponds, 'Dispute Challenger / Opponent responds', Dispute);
addStories(
  scenarios.challengeTimesOutAndIsDefunded,
  'Dispute Challenger / Challenge times out',
  Dispute,
);
addStories(scenarios.channelDoesntExist, "Dispute Challenger / Channel doesn't exist", Dispute);
addStories(scenarios.channelNotFullyOpen, 'Dispute Challenger / Channel not fully open', Dispute);
addStories(scenarios.alreadyHaveLatest, 'Dispute Challenger / Already have latest state', Dispute);
addStories(
  scenarios.userDeclinesChallenge,
  'Dispute Challenger / User declines challenge',
  Dispute,
);
addStories(scenarios.transactionFails, 'Dispute Challenger / Transaction fails', Dispute);
