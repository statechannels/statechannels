import {GanacheServer} from '@statechannels/devtools';

// import TestForceMoveArtifact from '../build/contracts/TESTForceMove.json';
// import testForceMoveArtifact from '../build/contracts/TESTForceMove.json';
// import testNitroAdjudicatorArtifact from '../build/contracts/TESTNitroAdjudicator.json';
// import testAssetHolderArtifact1 from '../build/contracts/TESTAssetHolder.json';
// import testAssetHolderArtifact2 from '../build/contracts/TESTAssetHolder2.json';
// import trivialAppArtifact from '../build/contracts/TrivialApp.json';
// import countingAppArtifact from '../build/contracts/CountingApp.json';
// import singleAssetPaymentsArtifact from '../build/contracts/SingleAssetPayments.json';
// import erc20AssetHolderArtifact from '../build/contracts/ERC20AssetHolder.json';
// import ethAssetHolderArtifact from '../build/contracts/ETHAssetHolder.json';
// import tokenArtifact from '../build/contracts/Token.json';

export async function deploy(chain: GanacheServer): Promise<object> {
  console.log(`Deploying built contracts to chain at: ${(await chain.provider).connection.url}`);

  // const deployer = console.log(testNitroAdjudicatorArtifact);

  return {};
}
