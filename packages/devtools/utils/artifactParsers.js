module.exports = {
  parseContractAddress: function (pathToArtifact, networkId) {
    const contractArtifact = require(pathToArtifact);
    const network = contractArtifact.networks[networkId];
    if (!network) {
      console.error(`There is no network information for network id ${networkId} in the artifact file ${pathToArtifact}`);
      process.exit(1);
    }
    return network.address;
  },
  parseABI: function (pathToArtifact) {
    const contractArtifact = require(pathToArtifact);
    const abi = contractArtifact.abi;
    if (!abi) {
      console.error(`There is no abi information for network id ${networkId} in the artifact file ${pathToArtifact}`);
      process.exit(1);
    }
    return abi;
  }
}