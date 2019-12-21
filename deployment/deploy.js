/* eslint-disable @typescript-eslint/no-var-requires */
const {
  NitroAdjudicatorArtifact,
  ConsensusAppArtifact,
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  TrivialAppArtifact,
  TokenArtifact
} = require('@statechannels/nitro-protocol').ContractArtifacts;

const {GanacheDeployer} = require('@statechannels/devtools');

const deploy = async deployer => {
  deployer = deployer || new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const CONSENSUS_APP_ADDRESS = await deployer.deploy(ConsensusAppArtifact);
  const TRIVIAL_APP_ADDRESS = await deployer.deploy(TrivialAppArtifact);

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(NitroAdjudicatorArtifact);
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    EthAssetHolderArtifact,
    {},
    NITRO_ADJUDICATOR_ADDRESS
  );

  const TEST_TOKEN_ADDRESS = await deployer.deploy(TokenArtifact);
  const TEST_TOKEN_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    Erc20AssetHolderArtifact,
    {},
    NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS
  );

  return {
    CONSENSUS_APP_ADDRESS,
    TRIVIAL_APP_ADDRESS,
    NITRO_ADJUDICATOR_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
    TEST_TOKEN_ADDRESS,
    TEST_TOKEN_ASSET_HOLDER_ADDRESS
  };
};

module.exports = {
  deploy
};
