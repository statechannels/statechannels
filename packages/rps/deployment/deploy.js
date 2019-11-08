const ethers = require("ethers");
const etherlime = require("etherlime-lib");
const path = require("path");
const writeJsonFile = require("write-json-file");
const loadJsonFile = require("load-json-file");

const RockPaperScissorsArtifact = require("../build/contracts/RockPaperScissors");

const {configureEnvVariables} = require("@statechannels/devtools");
configureEnvVariables();

const migrationFactory = (artifact, argsConstructor = () => []) => {
  return async (deployer, contractsToAddresses) => {
    const args = argsConstructor(contractsToAddresses);
    const contract = await deployer.deploy(artifact, false, ...args);
    // todo: contract name as a key does not hold enough information
    // as there can be many version of a contract
    return {
      ...contractsToAddresses,
      [artifact.contractName]: contract.contractAddress
    };
  };
};

const migrate = async (deployer, startingMap, migrations) => {
  return await migrations.reduce(async (currentMap, migration) => {
    // TODO: Don't migrate if the contract is already on the given network
    return migration(deployer, await currentMap);
  }, startingMap);
};

const deploy = async (network, secret, etherscanApiKey) => {
  // todo: use network parameter to pick deployer.

  let networkMap;
  try {
    networkMap = await loadJsonFile(path.join(__dirname, "/network-map.json"));
  } catch (err) {
    if (!!err.message.match("ENOENT: no such file or directory")) {
      networkMap = {};
    } else {
      throw err;
    }
  }
  const deployer = new etherlime.EtherlimeGanacheDeployer(
    // The privateKey is optional, but we have to provide it in order to provide a port.
    new etherlime.EtherlimeGanacheDeployer().signer.privateKey,
    Number(process.env.GANACHE_PORT)
  );
  if (!process.env.GANACHE_PORT) {
    throw new Error(`Environment variable GANACHE_PORT undefined`);
  }
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT}`);
  const networkId = (await provider.getNetwork()).chainId;

  const startingMap = networkMap[networkId] || [];
  const contractsToAddresses = await migrate(deployer, startingMap, [
    migrationFactory(RockPaperScissorsArtifact)
  ]);

  updatedNetworkMap = {...networkMap, [networkId]: contractsToAddresses};
  await writeJsonFile(path.join(__dirname, "network-map.json"), updatedNetworkMap);

  return {networkMap: updatedNetworkMap, deployer, networkId};
};

module.exports = {
  deploy,
  migrate,
  migrationFactory
};
