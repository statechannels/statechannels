const consensusAppArtifact = require("../build/contracts/ConsensusApp.json");
const ethAssetHolderArtifact = require("../build/contracts/ETHAssetHolder.json");
const erc20AssetHolderArtifact = require("../build/contracts/ERC20AssetHolder.json");
const nitroAdjudicatorArtifact = require("../build/contracts/NitroAdjudicator.json");
const trivialAppArtifact = require("../build/contracts/TrivialApp.json");
const tokenArtifact = require("../build/contracts/Token.json");

const {GanacheNCacheDeployer} = require("@statechannels/ganache-deployer");

const deploy = async (network, secret, etherscanApiKey) => {
  const deployer = new GanacheNCacheDeployer(8547);

  await deployer.deploy(consensusAppArtifact);
  await deployer.deploy(trivialAppArtifact);

  const nitroAdjudicatorAddress = await deployer.deploy(nitroAdjudicatorArtifact);
  await deployer.deploy(ethAssetHolderArtifact, {}, nitroAdjudicatorAddress);

  const tokenAddress = await deployer.deploy(tokenArtifact);
  await deployer.deploy(erc20AssetHolderArtifact, {}, nitroAdjudicatorAddress, tokenAddress);
};

module.exports = {
  deploy
};
