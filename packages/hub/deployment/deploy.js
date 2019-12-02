/* eslint-disable */
const {
  NitroAdjudicatorArtifact,
  ConsensusAppArtifact,
  EthAssetHolderArtifact,
  TrivialAppArtifact
} = require('@statechannels/nitro-protocol');

const {ETHERLIME_ACCOUNTS} = require('@statechannels/devtools');
const {GanacheNCacheDeployer} = require('@statechannels/ganache-deployer');

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547, ETHERLIME_ACCOUNTS[0].privateKey);

  await deployer.deploy(ConsensusAppArtifact);
  await deployer.deploy(TrivialAppArtifact);

  const nitroAdjudicatorAddress = await deployer.deploy(NitroAdjudicatorArtifact);
  await deployer.deploy(EthAssetHolderArtifact, {}, nitroAdjudicatorAddress);
};

module.exports = {
  deploy
};
