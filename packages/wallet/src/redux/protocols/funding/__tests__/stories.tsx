import {addStoriesFromScenario as addStories} from "../../../../__stories__";
import {Funding} from "../container";

import * as scenarios from "./scenarios";

addStories(scenarios.ledgerFunding, "Funding / Indirect funding", Funding);
addStories(scenarios.virtualFunding, "Funding / Virtual funding", Funding);
