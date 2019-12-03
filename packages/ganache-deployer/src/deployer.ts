import {DeployedArtifacts, GanacheServer} from '@statechannels/devtools';
import log from 'loglevel';

/* eslint-disable import/no-unresolved */
// @ts-ignore
import consensusAppArtifact from '@statechannels/nitro-protocol/build/contracts/ConsensusApp.json';
/* eslint-enable import/no-unresolved */
import countingAppArtifact from '@statechannels/nitro-protocol/build/contracts/CountingApp.json';
import erc20AssetHolderArtifact from '@statechannels/nitro-protocol/build/contracts/ERC20AssetHolder.json';
import ethAssetHolderArtifact from '@statechannels/nitro-protocol/build/contracts/ETHAssetHolder.json';
import nitroAdjudicatorArtifact from '@statechannels/nitro-protocol/build/contracts/NitroAdjudicator.json';
import singleAssetPaymentsArtifact from '@statechannels/nitro-protocol/build/contracts/SingleAssetPayments.json';
import testAssetHolderArtifact1 from '@statechannels/nitro-protocol/build/contracts/TESTAssetHolder.json';
import testAssetHolderArtifact2 from '@statechannels/nitro-protocol/build/contracts/TESTAssetHolder2.json';
import testForceMoveArtifact from '@statechannels/nitro-protocol/build/contracts/TESTForceMove.json';
import testNitroAdjudicatorArtifact from '@statechannels/nitro-protocol/build/contracts/TESTNitroAdjudicator.json';
import tokenArtifact from '@statechannels/nitro-protocol/build/contracts/Token.json';
import trivialAppArtifact from '@statechannels/nitro-protocol/build/contracts/TrivialApp.json';
// @ts-ignore
import forceMoveAppArtifact from '@statechannels/rps/build/contracts/ForceMoveApp.json';
import rpsArtifact from '@statechannels/rps/build/contracts/RockPaperScissors.json';

export async function deployContracts(chain: GanacheServer): Promise<object> {
  log.info(`Deploying built contracts to chain at: ${chain.provider.connection.url}`);

  return chain.deployContracts([
    rpsArtifact,
    forceMoveAppArtifact,
    consensusAppArtifact,
    testForceMoveArtifact,
    trivialAppArtifact,
    countingAppArtifact,
    singleAssetPaymentsArtifact,
    nitroAdjudicatorArtifact,
    testNitroAdjudicatorArtifact,
    tokenArtifact,
    {
      artifact: erc20AssetHolderArtifact,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (nitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [
            deployedArtifacts[nitroAdjudicatorArtifact.contractName].address,
            deployedArtifacts[tokenArtifact.contractName].address,
          ];
        }
        throw Error(`${erc20AssetHolderArtifact.contractName} requires that the following contracts are deployed:
          - ${nitroAdjudicatorArtifact.contractName}
          - ${tokenArtifact.contractName}
        `);
      },
    },
    {
      artifact: ethAssetHolderArtifact,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (nitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [deployedArtifacts[nitroAdjudicatorArtifact.contractName].address];
        }
        throw Error(`${ethAssetHolderArtifact.contractName} requires that the following contracts are deployed:
          - ${nitroAdjudicatorArtifact.contractName}
        `);
      },
    },
    {
      artifact: testAssetHolderArtifact1,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (testNitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [deployedArtifacts[testNitroAdjudicatorArtifact.contractName].address];
        }
        throw Error(`${testAssetHolderArtifact1.contractName} requires that the following contracts are deployed:
          - ${testNitroAdjudicatorArtifact.contractName}
        `);
      },
    },
    {
      artifact: testAssetHolderArtifact2,
      arguments: (deployedArtifacts: DeployedArtifacts) => {
        if (testNitroAdjudicatorArtifact.contractName in deployedArtifacts) {
          return [deployedArtifacts[testNitroAdjudicatorArtifact.contractName].address];
        }
        throw Error(`${testAssetHolderArtifact2.contractName} requires that the following contracts are deployed:
          - ${testNitroAdjudicatorArtifact.contractName}
        `);
      },
    },
  ]);
}
