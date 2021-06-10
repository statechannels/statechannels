/* eslint-disable @typescript-eslint/no-var-requires */
const {
  NitroAdjudicatorArtifact,
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  TokenArtifact
} = require('@statechannels/nitro-protocol').ContractArtifacts;


const [
  ethAssetHolderFactory,
  erc20AssetHolderFactory,
  nitroAdjudicatorFactory,
  tokenFactory
] = [
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  NitroAdjudicatorArtifact,
  TokenArtifact
].map(artifact =>
  new ContractFactory(artifact.abi, artifact.bytecode).connect(provider.getSigner(0))
);

const deploy = async () => {
  const TRIVIAL_APP_ADDRESS = makeAddress(constants.AddressZero);

  const TRIVIAL_APP_ADDRESS = makeAddress(constants.AddressZero);

  const NITRO_ADJUDICATOR_ADDRESS = (await nitroAdjudicatorFactory.deploy()).address;
  const ETH_ASSET_HOLDER_ADDRESS = (await ethAssetHolderFactory.deploy(NITRO_ADJUDICATOR_ADDRESS))
    .address;

  const TEST_TOKEN_ADDRESS = (
    await tokenFactory.deploy(new Wallet(TEST_ACCOUNTS[0].privateKey).address)
  ).address;
  const TEST_TOKEN_ASSET_HOLDER_ADDRESS = (
    await erc20AssetHolderFactory.deploy(NITRO_ADJUDICATOR_ADDRESS, TEST_TOKEN_ADDRESS)
  ).address;

  return {
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
