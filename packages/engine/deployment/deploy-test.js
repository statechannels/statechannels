const path = require('path');
const writeJsonFile = require('write-json-file');
const trivialAppArtifact = require('../build/contracts/TrivialApp.json');

process.env.NODE_ENV = 'test'
const {configureEnvVariables} = require('@statechannels/devtools');
configureEnvVariables();

const { migrate, migrationFactory, deploy } = require('./deploy');

const deployTest = async (network, secret, etherscanApiKey) => {
  let { networkMap, deployer, networkId } = await deploy(network, secret, etherscanApiKey);
  const startingMap = networkMap[networkId] || {};
  const contractsToAddresses = await migrate(deployer, startingMap, [ migrationFactory(trivialAppArtifact) ])

  const updatedNetworkMap = {
    ...networkMap,
    [networkId]: {...networkMap[networkId], ...contractsToAddresses},
  };
  
  await writeJsonFile(path.join(__dirname, 'network-map.json'), updatedNetworkMap);
};

module.exports = {
  deploy: deployTest,
};
