import {prependToScenarioLocator} from "../../__tests__";
import {EmbeddedProtocol} from "../../../../communication";

import * as scenarios from "./scenarios";
export const preSuccess = prependToScenarioLocator(
  scenarios.happyPath.fundApp,
  EmbeddedProtocol.VirtualFunding
);
