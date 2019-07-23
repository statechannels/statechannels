import * as scenarios from './scenarios';
import { prependToScenarioLocator } from '../../__tests__';
import { EmbeddedProtocol } from '../../../../communication';
export const preSuccess = prependToScenarioLocator(
  scenarios.happyPath.fundApp,
  EmbeddedProtocol.VirtualFunding,
);
