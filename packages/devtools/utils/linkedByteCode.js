const linker = require("solc/linker");

module.exports = {
  linkedByteCode: function linkedByteCode(artifact, linkedLibrary, networkId) {
    const lookup = {};
    try {
      lookup[linkedLibrary.contractName] =
        linkedLibrary.networks[networkId].address;
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error(
        linkedLibrary.networks,
        linkedLibrary.contractName,
        networkId
      );
    }
    return linker.linkBytecode(artifact.bytecode, lookup);
  }
};
