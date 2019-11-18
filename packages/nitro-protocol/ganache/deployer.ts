import { GanacheServer, DeployedArtifacts } from '@statechannels/devtools';
import log from 'loglevel';

import countingAppArtifact from '../build/contracts/CountingApp.json';
import erc20AssetHolderArtifact from '../build/contracts/ERC20AssetHolder.json';
import ethAssetHolderArtifact from '../build/contracts/ETHAssetHolder.json';
import singleAssetPaymentsArtifact from '../build/contracts/SingleAssetPayments.json';
import testAssetHolderArtifact1 from '../build/contracts/TESTAssetHolder.json';
import testAssetHolderArtifact2 from '../build/contracts/TESTAssetHolder2.json';
import testForceMoveArtifact from '../build/contracts/TESTForceMove.json';
import nitroAdjudicatorArtifact from '../build/contracts/NitroAdjudicator.json';
import testNitroAdjudicatorArtifact from '../build/contracts/TESTNitroAdjudicator.json';
import tokenArtifact from '../build/contracts/Token.json';
import trivialAppArtifact from '../build/contracts/TrivialApp.json';
import consensusAppArtifact from '../build/contracts/ConsensusApp.json';
import rpsArtifact from '@statechannels/rps/build/contracts/RockPaperScissors.json';
import forceMoveAppArtifact from '@statechannels/rps/build/contracts/ForceMoveApp.json';

export async function deployContracts(chain: GanacheServer): Promise<object> {
  log.info(`Deploying built contracts to chain at: ${chain.provider.connection.url}`);

  return chain.deployContracts([
    rpsArtifact,
    forceMoveAppArtifact,
    consensusAppArtifact,
    testForceMoveArtifact,
    testAssetHolderArtifact1,
    testAssetHolderArtifact2,
    trivialAppArtifact,
    countingAppArtifact,
    singleAssetPaymentsArtifact,
    nitroAdjudicatorArtifact,
    testNitroAdjudicatorArtifact,
    tokenArtifact,
    {
      artifact: erc20AssetHolderArtifact,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (testNitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [
            deployedArtifacts[testNitroAdjudicatorArtifact.contractName].address,
            deployedArtifacts[tokenArtifact.contractName].address,
          ];
        }
        throw Error(`${erc20AssetHolderArtifact.contractName} requires that the following contracts are deployed:
          - ${testNitroAdjudicatorArtifact.contractName}
          - ${tokenArtifact.contractName}
        `);
      },
    },
    {
      artifact: ethAssetHolderArtifact,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (testNitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [deployedArtifacts[testNitroAdjudicatorArtifact.contractName].address];
        }
        throw Error(`${ethAssetHolderArtifact.contractName} requires that the following contracts are deployed:
          - ${testNitroAdjudicatorArtifact.contractName}
        `);
      },
    },
  ]);
}
