import {ContractArtifacts, TestContractArtifacts} from '@statechannels/nitro-protocol';
import {makeAddress} from '@statechannels/wallet-core';
import {constants, Wallet} from 'ethers';
import {TEST_ACCOUNTS, GanacheDeployer} from '@statechannels/devtools';

export async function deploy(): Promise<any> {
  // eslint-disable-next-line no-process-env
  const deployer = new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const {EthAssetHolderArtifact, Erc20AssetHolderArtifact} = ContractArtifacts;
  const {TestNitroAdjudicatorArtifact, TokenArtifact} = TestContractArtifacts;

  const TRIVIAL_APP_ADDRESS = makeAddress(constants.AddressZero);

  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(TestNitroAdjudicatorArtifact as any);
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    EthAssetHolderArtifact as any,
    {},
    NITRO_ADJUDICATOR_ADDRESS
  );

  const ethereumPrivateKey = TEST_ACCOUNTS[0].privateKey;
  const TEST_TOKEN_ADDRESS = await deployer.deploy(
    TokenArtifact as any,
    {},
    new Wallet(ethereumPrivateKey).address
  );
  const TEST_TOKEN_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    Erc20AssetHolderArtifact as any,
    {},
    NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS
  );

  return {
    TRIVIAL_APP_ADDRESS,
    NITRO_ADJUDICATOR_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
    TEST_TOKEN_ADDRESS,
    TEST_TOKEN_ASSET_HOLDER_ADDRESS
  };
}
