import {GanacheServer} from '@statechannels/devtools';
import log from 'loglevel';

import countingAppArtifact from '../build/contracts/CountingApp.json';
import erc20AssetHolderArtifact from '../build/contracts/ERC20AssetHolder.json';
import ethAssetHolderArtifact from '../build/contracts/ETHAssetHolder.json';
import singleAssetPaymentsArtifact from '../build/contracts/SingleAssetPayments.json';
import testAssetHolderArtifact1 from '../build/contracts/TESTAssetHolder.json';
import testAssetHolderArtifact2 from '../build/contracts/TESTAssetHolder2.json';
import testForceMoveArtifact from '../build/contracts/TESTForceMove.json';
import testNitroAdjudicatorArtifact from '../build/contracts/TESTNitroAdjudicator.json';
import tokenArtifact from '../build/contracts/Token.json';
import trivialAppArtifact from '../build/contracts/TrivialApp.json';

export async function deployContracts(chain: GanacheServer): Promise<object> {
  log.info(`Deploying built contracts to chain at: ${chain.provider.connection.url}`);

  return chain.deployContracts([
    testForceMoveArtifact,
    testAssetHolderArtifact1,
    testAssetHolderArtifact2,
    trivialAppArtifact,
    countingAppArtifact,
    singleAssetPaymentsArtifact,
    testNitroAdjudicatorArtifact,
    tokenArtifact,
    {
      artifact: erc20AssetHolderArtifact,
      arguments: [testNitroAdjudicatorArtifact.contractName, tokenArtifact.contractName],
    },
    {
      artifact: ethAssetHolderArtifact,
      arguments: [testNitroAdjudicatorArtifact.contractName],
    },
  ]);
}
