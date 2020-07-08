/* eslint-disable */
const {ContractArtifacts} = require('@statechannels/nitro-protocol');
const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(
    ContractArtifacts.NitroAdjudicatorArtifact
  );
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    ContractArtifacts.EthAssetHolderArtifact,
    {},
    NITRO_ADJUDICATOR_ADDRESS
  );
  return {
    NITRO_ADJUDICATOR_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS
  };
};

module.exports = {
  deploy
};
