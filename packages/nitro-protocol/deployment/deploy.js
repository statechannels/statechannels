const consensusAppArtifact = require('../build/contracts/ConsensusApp.json');
const countingAppArtifact = require('../build/contracts/CountingApp.json');
const erc20AssetHolderArtifact = require('../build/contracts/ERC20AssetHolder.json');
const ethAssetHolderArtifact = require('../build/contracts/ETHAssetHolder.json');
const nitroAdjudicatorArtifact = require('../build/contracts/NitroAdjudicator.json');
const singleAssetPaymentsArtifact = require('../build/contracts/SingleAssetPayments.json');
const testAssetHolderArtifact1 = require('../build/contracts/TESTAssetHolder.json');
const testAssetHolderArtifact2 = require('../build/contracts/TESTAssetHolder2.json');
const testForceMoveArtifact = require('../build/contracts/TESTForceMove.json');
const testNitroAdjudicatorArtifact = require('../build/contracts/TESTNitroAdjudicator.json');
const tokenArtifact = require('../build/contracts/Token.json');
const trivialAppArtifact = require('../build/contracts/TrivialApp.json');

const {GanacheNCacheDeployer} = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  const nitroAdjudicatorAddress = await deployer.deploy(nitroAdjudicatorArtifact);

  await deployer.deploy(countingAppArtifact);
  await deployer.deploy(singleAssetPaymentsArtifact);
  await deployer.deploy(testAssetHolderArtifact1);
  await deployer.deploy(testAssetHolderArtifact2);
  await deployer.deploy(consensusAppArtifact);
  await deployer.deploy(trivialAppArtifact);
  await deployer.deploy(testForceMoveArtifact);

  // for test purposes in this package, wire up the assetholders with the testNitroAdjudicator
  const testNitroAdjudicatorAddress = await deployer.deploy(testNitroAdjudicatorArtifact);
  const tokenAddress = await deployer.deploy(tokenArtifact);
  await deployer.deploy(ethAssetHolderArtifact, {}, testNitroAdjudicatorAddress);
  await deployer.deploy(erc20AssetHolderArtifact, {}, testNitroAdjudicatorAddress, tokenAddress);
};

module.exports = {
  deploy,
};
