import {addStoriesFromScenario as addStories} from "../../../../__stories__";
import {LedgerDefunding} from "../container";

import * as scenarios from "./scenarios";

function flattenScenario(scenario) {
  Object.keys(scenario).forEach(key => {
    if (scenario[key].state) {
      scenario[key].state = scenario[key].state.state;
    }
  });
  return scenario;
}

addStories(
  flattenScenario(scenarios.clearedToSendHappyPath),
  "Ledger Defunding / PlayerA / Happy Path",
  LedgerDefunding
);
