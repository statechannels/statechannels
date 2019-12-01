/* eslint-disable */
const consensusAppArtifact = require('../build/contracts/ConsensusApp.json');
const ethAssetHolderArtifact = require('../build/contracts/ETHAssetHolder.json');
const nitroAdjudicatorArtifact = require('../build/contracts/NitroAdjudicator.json');
const trivialAppArtifact = require('../build/contracts/TrivialApp.json');

const {GanacheNCacheDeployer} = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  await deployer.deploy(consensusAppArtifact);
  await deployer.deploy(trivialAppArtifact);

  const nitroAdjudicatorAddress = await deployer.deploy(nitroAdjudicatorArtifact);
  await deployer.deploy(ethAssetHolderArtifact, {}, nitroAdjudicatorAddress);
};

module.exports = {
  deploy
};
