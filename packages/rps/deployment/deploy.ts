import { GanacheServer } from '@statechannels/devtools';
import log from 'loglevel';

import rpsArtifact from '../build/contracts/RockPaperScissors.json';

export async function deployContracts(chain: GanacheServer): Promise<object> {
  log.info(`Deploying built contracts to chain at: ${chain.provider.connection.url}`);
  return chain.deployContracts([rpsArtifact]);
}
