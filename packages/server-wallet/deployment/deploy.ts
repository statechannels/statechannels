import {Address} from '@statechannels/client-api-schema';
import {ContractArtifacts} from '@statechannels/nitro-protocol';
import {GanacheDeployer} from '@statechannels/devtools';

import config from '../src/config';

// NOTE: deploying contracts like this allows the onchain service package to
// be easily extracted

export type TestNetworkContext = {
  ethAssetHolder: Address;
  token: Address;
  tokenAssetHolder: Address;
  nitroAdjudicator: Address;
};

export async function deploy(): Promise<TestNetworkContext> {
  // TODO: best way to configure this?
  const deployer = new GanacheDeployer(8545, config.serverPrivateKey);
  const {
    EthAssetHolderArtifact,
    TokenArtifact,
    Erc20AssetHolderArtifact,
    NitroAdjudicatorArtifact,
  } = ContractArtifacts;

  const nitroAdjudicator = await deployer.deploy(NitroAdjudicatorArtifact);
  const token = await deployer.deploy(TokenArtifact);
  const tokenAssetHolder = await deployer.deploy(Erc20AssetHolderArtifact);
  const ethAssetHolder = await deployer.deploy(EthAssetHolderArtifact);

  return {
    nitroAdjudicator,
    token,
    tokenAssetHolder,
    ethAssetHolder,
  };
}
