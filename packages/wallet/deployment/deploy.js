const ethAssetHolderArtifact = require("../build/contracts/ETHAssetHolder");
const nitroAdjudicatorArtifact = require("../build/contracts/NitroAdjudicator");
const consensusAppArtifact = require("../build/contracts/ConsensusApp");

const {GanacheNCacheDeployer} = require("@statechannels/ganache-deployer");

const deploy = async (_network, _secret, _etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  const nitroAdjudicatorAddress = await deployer.deploy(nitroAdjudicatorArtifact);
  await deployer.deploy(ethAssetHolderArtifact, {}, nitroAdjudicatorAddress);
  await deployer.deploy(consensusAppArtifact);
};

module.exports = {
  deploy
};
