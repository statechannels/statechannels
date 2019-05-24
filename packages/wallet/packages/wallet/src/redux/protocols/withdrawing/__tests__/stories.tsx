import * as scenarios from './scenarios';

import { addStoriesFromScenario as addStories } from '../../../../__stories__';

addStories(scenarios.happyPath, 'Withdrawal / Happy path');
addStories(scenarios.withdrawalRejected, 'Withdrawal / User rejects withdrawal ');
addStories(scenarios.failedTransaction, 'Withdrawal / Transaction fails');
addStories(scenarios.channelNotClosed, 'Withdrawal / Channel not closed');
