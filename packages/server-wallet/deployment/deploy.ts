import {Address} from '@statechannels/client-api-schema';
import {ContractArtifacts, TestContractArtifacts} from '@statechannels/nitro-protocol';
import {TEST_ACCOUNTS} from '@statechannels/devtools';
import {ContractFactory, providers, Wallet} from 'ethers';

const {EthAssetHolderArtifact, Erc20AssetHolderArtifact} = ContractArtifacts;
const {TestNitroAdjudicatorArtifact, TokenArtifact} = TestContractArtifacts;

export type TestNetworkContext = {
  ETH_ASSET_HOLDER_ADDRESS: Address;
  ERC20_ADDRESS: Address;
  ERC20_ASSET_HOLDER_ADDRESS: Address;
  NITRO_ADJUDICATOR_ADDRESS: Address;
};

// NOTE: deploying contracts like this allows the onchain service package to
// be easily extracted
// eslint-disable-next-line no-process-env
export async function deploy(
  rpcEndPoint = 'http://localhost:' + process.env.GANACHE_PORT
): Promise<TestNetworkContext> {
  const provider = new providers.JsonRpcProvider(rpcEndPoint);

  const [
    ethAssetHolderFactory,
    erc20AssetHolderFactory,
    testNitroAdjudicatorFactory,
    tokenFactory,
  ] = [
    EthAssetHolderArtifact,
    Erc20AssetHolderArtifact,
    TestNitroAdjudicatorArtifact,
    TokenArtifact,
  ].map(artifact =>
    new ContractFactory(artifact.abi, artifact.bytecode).connect(provider.getSigner(0))
  );

  const NITRO_ADJUDICATOR_ADDRESS = (await testNitroAdjudicatorFactory.deploy()).address;
  const ETH_ASSET_HOLDER_ADDRESS = (await ethAssetHolderFactory.deploy(NITRO_ADJUDICATOR_ADDRESS))
    .address;

  const ERC20_ADDRESS = (await tokenFactory.deploy(new Wallet(TEST_ACCOUNTS[0].privateKey).address))
    .address;
  const ERC20_ASSET_HOLDER_ADDRESS = (
    await erc20AssetHolderFactory.deploy(NITRO_ADJUDICATOR_ADDRESS, ERC20_ADDRESS)
  ).address;

  return {
    NITRO_ADJUDICATOR_ADDRESS,
    ERC20_ADDRESS,
    ERC20_ASSET_HOLDER_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
  };
}
