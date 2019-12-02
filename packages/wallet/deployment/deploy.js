const {
  NitroAdjudicatorArtifact,
  ConsensusAppArtifact,
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  TrivialAppArtifact
} = require("@statechannels/nitro-protocol");

const {GanacheNCacheDeployer} = require("@statechannels/ganache-deployer");

const deploy = async (network, secret, etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  await deployer.deploy(ConsensusAppArtifact);
  await deployer.deploy(TrivialAppArtifact);

  const nitroAdjudicatorAddress = await deployer.deploy(NitroAdjudicatorArtifact);
  await deployer.deploy(EthAssetHolderArtifact, {}, nitroAdjudicatorAddress);

  const tokenAddress = await deployer.deploy(TokenArtifact);
  await deployer.deploy(Erc20AssetHolderArtifact, {}, nitroAdjudicatorAddress, tokenAddress);
};

module.exports = {
  deploy
};
