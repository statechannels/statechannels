import {Address} from '@statechannels/client-api-schema';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {GanacheDeployer} from '@statechannels/devtools';
import {defaultConfig} from '../src/config';

// NOTE: deploying contracts like this allows the onchain service package to
// be easily extracted

export type TestNetworkContext = {
  ETH_ASSET_HOLDER_ADDRESS: Address;
  ERC20_ADDRESS: Address;
  ERC20_ASSET_HOLDER_ADDRESS: Address;
  NITRO_ADJUDICATOR_ADDRESS: Address;
};

export async function deploy(): Promise<TestNetworkContext> {
  // TODO: best way to configure this?
  const deployer = new GanacheDeployer(8545, defaultConfig.ethereumPrivateKey);
  const {
    EthAssetHolderArtifact,
    TokenArtifact,
    Erc20AssetHolderArtifact,
    NitroAdjudicatorArtifact,
  } = ContractArtifacts;


  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(NitroAdjudicatorArtifact as any);
  const ERC20_ADDRESS = await deployer.deploy(TokenArtifact as any, {}, 0);
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
