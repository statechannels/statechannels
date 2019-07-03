import * as scenarios from './scenarios';
import { addStoriesFromScenario as addStories } from '../../../../../__stories__';
import { NewLedgerFunding } from '../../container';

function flattenScenario(scenario) {
  Object.keys(scenario).forEach(key => {
    if (scenario[key].state) {
      scenario[key].state = scenario[key].state.state;
    }
  });
  return scenario;
}

addStories(
  flattenScenario(scenarios.happyPath),
  'New Ledger Funding/ Player B / Happy Path',
  NewLedgerFunding,
);
addStories(
  flattenScenario(scenarios.ledgerFundingFails),
  'New Ledger Funding/ Player B / Ledger funding fails',
  NewLedgerFunding,
);
