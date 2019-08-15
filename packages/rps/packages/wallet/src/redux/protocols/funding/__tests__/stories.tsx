import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../__stories__';
import { Funding } from '../container';

addStories(scenarios.ledgerFunding, 'Funding / Indirect funding', Funding);
addStories(scenarios.virtualFunding, 'Funding / Virtual funding', Funding);
