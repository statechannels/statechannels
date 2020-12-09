import {Address} from '@statechannels/client-api-schema';
import {ContractArtifacts, TestContractArtifacts} from '@statechannels/nitro-protocol';
import {ETHERLIME_ACCOUNTS, GanacheDeployer} from '@statechannels/devtools';
import {Wallet} from 'ethers';

// NOTE: deploying contracts like this allows the onchain service package to
// be easily extracted

export type TestNetworkContext = {
  ETH_ASSET_HOLDER_ADDRESS: Address;
  ERC20_ADDRESS: Address;
  ERC20_ASSET_HOLDER_ADDRESS: Address;
  NITRO_ADJUDICATOR_ADDRESS: Address;
};

export async function deploy(): Promise<TestNetworkContext> {
  const ethereumPrivateKey = ETHERLIME_ACCOUNTS[0].privateKey;

  // TODO: best way to configure this?
  const deployer = new GanacheDeployer(8545, ethereumPrivateKey);
  const {EthAssetHolderArtifact, TokenArtifact, Erc20AssetHolderArtifact} = ContractArtifacts;

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(TestContractArtifacts.TestNitroAdjudicatorArtifact as any);
  const ERC20_ADDRESS = await deployer.deploy(
    TokenArtifact as any,
    {},
    new Wallet(ethereumPrivateKey).address
  );
  const ERC20_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    Erc20AssetHolderArtifact as any,
    {},
    NITRO_ADJUDICATOR_ADDRESS,
    ERC20_ADDRESS
  );
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    EthAssetHolderArtifact as any,
    {},
    NITRO_ADJUDICATOR_ADDRESS
  );

  return {
    NITRO_ADJUDICATOR_ADDRESS,
    ERC20_ADDRESS,
    ERC20_ASSET_HOLDER_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
  };
}
