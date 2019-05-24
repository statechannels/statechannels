import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';

function flattenScenario(scenario) {
  Object.keys(scenario).forEach(key => {
    if (scenario[key].state) {
      scenario[key].state = scenario[key].state.state;
    }
  });
  return scenario;
}

addStories(flattenScenario(scenarios.happyPath), 'Indirect Funding / Player B / Happy Path');
addStories(
  flattenScenario(scenarios.ledgerFundingFails),
  'Indirect Funding / Player B / Ledger funding fails',
);
