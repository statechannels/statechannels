import {ContractArtifacts, TestContractArtifacts} from '@statechannels/nitro-protocol';
import {makeAddress} from '@statechannels/wallet-core';
import {constants, ContractFactory, providers, Wallet} from 'ethers';
import {TEST_ACCOUNTS} from '@statechannels/devtools';

// eslint-disable-next-line no-process-env
const rpcEndPoint = 'http://localhost:' + process.env.GANACHE_PORT;
const provider = new providers.JsonRpcProvider(rpcEndPoint);

const {EthAssetHolderArtifact, Erc20AssetHolderArtifact} = ContractArtifacts;
const {TestNitroAdjudicatorArtifact, TokenArtifact} = TestContractArtifacts;

const [
  ethAssetHolderFactory,
  erc20AssetHolderFactory,
  testNitroAdjudicatorFactory,
  tokenFactory
] = [
  EthAssetHolderArtifact,
  Erc20AssetHolderArtifact,
  TestNitroAdjudicatorArtifact,
  TokenArtifact
].map(artifact =>
  new ContractFactory(artifact.abi, artifact.bytecode).connect(provider.getSigner(0))
);

export async function deploy(): Promise<any> {
  const TRIVIAL_APP_ADDRESS = makeAddress(constants.AddressZero);

  const NITRO_ADJUDICATOR_ADDRESS = (await testNitroAdjudicatorFactory.deploy()).address;
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
}
