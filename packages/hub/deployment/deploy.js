/* eslint-disable */
const {
  NitroAdjudicatorArtifact,
  ConsensusAppArtifact,
  EthAssetHolderArtifact,
  TrivialAppArtifact
} = require('@statechannels/nitro-protocol');

const {GanacheNCacheDeployer} = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  await deployer.deploy(ConsensusAppArtifact);
  await deployer.deploy(TrivialAppArtifact);

  const nitroAdjudicatorAddress = await deployer.deploy(NitroAdjudicatorArtifact);
  await deployer.deploy(EthAssetHolderArtifact, {}, nitroAdjudicatorAddress);
};

module.exports = {
  deploy
};
