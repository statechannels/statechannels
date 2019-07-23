import {
  twoPlayerAHappyPath,
  twoPlayerBHappyPath,
  threePlayerAHappyPath,
  threePlayerBHappyPath,
  threePlayerHubHappyPath,
} from './scenarios';
import { prependToScenarioLocator } from '../../__tests__';
import { EmbeddedProtocol } from '../../../../communication';

export const twoPlayerPreSuccessA = prependToScenarioLocator(
  twoPlayerAHappyPath.commitmentSent,
  EmbeddedProtocol.ConsensusUpdate,
);
export const twoPlayerPreSuccessB = prependToScenarioLocator(
  twoPlayerBHappyPath.notSafeToSend,
  EmbeddedProtocol.ConsensusUpdate,
);

export const threePlayerPreSuccessA = prependToScenarioLocator(
  threePlayerAHappyPath.waitForHubUpdate,
  EmbeddedProtocol.ConsensusUpdate,
);
export const threePlayerPreSuccessB = prependToScenarioLocator(
  threePlayerBHappyPath.waitForHubUpdate,
  EmbeddedProtocol.ConsensusUpdate,
);
export const threePlayerPreSuccessHub = prependToScenarioLocator(
  threePlayerHubHappyPath.waitForPlayerBUpdate,
  EmbeddedProtocol.ConsensusUpdate,
);
