const ethers = require('ethers');
const etherlime = require('etherlime-lib');
const path = require('path');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');

const testForceMoveArtifact = require('../build/contracts/TESTForceMove.json');
const testNitroAdjudicatorArtifact = require('../build/contracts/TESTNitroAdjudicator.json');
const testAssetHolderArtifact = require('../build/contracts/TESTAssetHolder.json');
const trivialAppArtifact = require('../build/contracts/TrivialApp.json');
const countingAppArtifact = require('../build/contracts/CountingApp.json');
const singleAssetPaymentsArtifact = require('../build/contracts/SingleAssetPayments.json');

const erc20AssetHolderArtifact = require('../build/contracts/ERC20AssetHolder.json');
const ethAssetHolderArtifact = require('../build/contracts/ETHAssetHolder.json');
const tokenArtifact = require('../build/contracts/token.json');

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
  let networkMap;
  try {
    networkMap = await loadJsonFile(path.join(__dirname, '/network-map.json'));
  } catch (err) {
    if (!!err.message.match('ENOENT: no such file or directory')) {
      networkMap = {};
    } else {
      throw err;
    }
  }
  const deployer = new etherlime.EtherlimeGanacheDeployer();
  const provider = new ethers.providers.JsonRpcProvider(deployer.nodeUrl);
  const networkId = (await provider.getNetwork()).chainId;

  await deployArtifact(deployer, testNitroAdjudicatorArtifact);
  console.log(
    `trying to pull out ${contractsToAddresses[testNitroAdjudicatorArtifact.contractName]}`,
  );
  await deployArtifact(deployer, ethAssetHolderArtifact, [
    contractsToAddresses[testNitroAdjudicatorArtifact.contractName],
  ]);
  await deployArtifact(deployer, erc20AssetHolderArtifact, [
    contractsToAddresses[testNitroAdjudicatorArtifact.contractName],
    networkMap[networkId][tokenArtifact.contractName],
  ]);
  await deployArtifact(deployer, testAssetHolderArtifact);
  await deployArtifact(deployer, trivialAppArtifact);
  await deployArtifact(deployer, countingAppArtifact);
  await deployArtifact(deployer, singleAssetPaymentsArtifact);
  await deployArtifact(deployer, testForceMoveArtifact);

  const updatedNetworkMap = {
    ...networkMap,
    [networkId]: {...networkMap[networkId], ...contractsToAddresses},
  };
  await writeJsonFile(path.join(__dirname, 'network-map.json'), updatedNetworkMap);
};

module.exports = {
  deploy,
};
