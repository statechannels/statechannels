const ethers = require('ethers');
const etherlime = require('etherlime-lib');
const path = require('path');
const writeJsonFile = require('write-json-file');
const loadJsonFile = require('load-json-file');

const trivialAppArtifact = require('../build/contracts/TrivialApp.json');

let contractsToAddresses = {};

async function getNetworkMap() {
  try {
    return await loadJsonFile(path.join(__dirname, 'network-map.json'));
  } catch (err) {
    if (!!err.message.match('ENOENT: no such file or directory')) {
      return {};
    } else {
      throw err;
    }
  }
}

async function deployArtifact(deployer, artifact, constructorArgs = []) {
  const contract = await deployer.deploy(artifact, false, ...constructorArgs);
  // todo: contract name as a key does not hold enough information as there can be many version of a contract
  contractsToAddresses = {
    ...contractsToAddresses,
    [artifact.contractName]: contract.contractAddress,
  };
}

const deploy = async (network, secret, etherscanApiKey) => {
  let networkMap = await getNetworkMap();
  const deployer = new etherlime.EtherlimeGanacheDeployer();
  const provider = new ethers.providers.JsonRpcProvider(deployer.nodeUrl);
  const networkId = (await provider.getNetwork()).chainId;

  await deployArtifact(deployer, trivialAppArtifact);

  networkMap = {
    ...networkMap,
    [networkId]: {...networkMap[networkId], ...contractsToAddresses},
  };
  await writeJsonFile(path.join(__dirname, 'network-map.json'), networkMap);
};

module.exports = {
  deploy,
};
