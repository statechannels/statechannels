const ethers = require('ethers');
const etherlime = require('etherlime-lib');
const networkMap = require('./network-map.json');
const path = require('path');
const writeJsonFile = require('write-json-file');

const tokenArtifact = require('../build/contracts/Token.json');
const ethAssetHolderArtifact = require('../build/contracts/ETHAssetHolder');
const erc20AssetHolderArtifact = require('../build/contracts/ERC20AssetHolder');
const nitroAdjudicatorArtifact = require('../build/contracts/NitroAdjudicator');
const consensusAppArtifact = require('../build/contracts/ConsensusApp');

let contractsToAddresses = {};

async function deployArtifact(deployer, artifact, constructorArgs = []) {
  const contract = await deployer.deploy(artifact, false, ...constructorArgs);
  // todo: contract name as a key does not hold enough information as there can be many version of a contract
  contractsToAddresses = {
    ...contractsToAddresses,
    [artifact.contractName]: contract.contractAddress,
  };
}

const deploy = async (network, secret, etherscanApiKey) => {
  // todo: use network parameter to pick deployer.
  const deployer = new etherlime.EtherlimeGanacheDeployer();
  const provider = new ethers.providers.JsonRpcProvider(deployer.nodeUrl);
  const networkId = (await provider.getNetwork()).chainId;

  await deployArtifact(deployer, tokenArtifact);
  await deployArtifact(deployer, nitroAdjudicatorArtifact);
  await deployArtifact(deployer, ethAssetHolderArtifact, [
    contractsToAddresses[nitroAdjudicatorArtifact.contractName],
  ]);
  await deployArtifact(deployer, erc20AssetHolderArtifact, [
    contractsToAddresses[nitroAdjudicatorArtifact.contractName],
    contractsToAddresses[tokenArtifact.contractName],
  ]);
  await deployArtifact(deployer, consensusAppArtifact);

  updatedNetworkMap = {...networkMap, [networkId]: contractsToAddresses};
  await writeJsonFile(path.join(__dirname, 'network-map.json'), updatedNetworkMap);
};

module.exports = {
  deploy,
};
