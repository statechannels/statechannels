/* eslint-disable */
const {ContractArtifacts} = require('@statechannels/nitro-protocol');
const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const CONSENSUS_APP_ADDRESS = await deployer.deploy(ContractArtifacts.ConsensusAppArtifact);
  const TRIVIAL_APP_ADDRESS = await deployer.deploy(ContractArtifacts.TrivialAppArtifact);

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(
    ContractArtifacts.NitroAdjudicatorArtifact
  );
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    ContractArtifacts.EthAssetHolderArtifact,
    {},
    NITRO_ADJUDICATOR_ADDRESS
  );
  return {
    CONSENSUS_APP_ADDRESS,
    TRIVIAL_APP_ADDRESS,
    NITRO_ADJUDICATOR_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS
  };
};

module.exports = {
  deploy
};
