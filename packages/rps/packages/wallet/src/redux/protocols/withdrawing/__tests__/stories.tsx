import * as scenarios from './scenarios';

import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { Withdrawal } from '../container';

addStories(scenarios.happyPath, 'Withdrawal / Happy path', Withdrawal);
addStories(scenarios.withdrawalRejected, 'Withdrawal / User rejects withdrawal ', Withdrawal);
addStories(scenarios.failedTransaction, 'Withdrawal / Transaction fails', Withdrawal);
addStories(scenarios.channelNotClosed, 'Withdrawal / Channel not closed', Withdrawal);
