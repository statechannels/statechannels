// NOTE: this script manages deploying contracts for testing purposes ONLY
// DO NOT USE THIS SCRIPT TO DEPLOY CONTRACTS TO PRODUCTION NETWORKS
import {GanacheDeployer, ETHERLIME_ACCOUNTS} from '@statechannels/devtools';
import {Wallet} from 'ethers';

import {getTestProvider, setupContracts, writeGasConsumption} from '../test/test-helpers';
import countingAppArtifact from '../artifacts/contracts/CountingApp.sol/CountingApp.json';
import erc20AssetHolderArtifact from '../artifacts/contracts/test/TestErc20AssetHolder.sol/TestErc20AssetHolder.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import singleAssetPaymentsArtifact from '../artifacts/contracts/examples/SingleAssetPayments.sol/SingleAssetPayments.json';
import hashLockedSwapArtifact from '../artifacts/contracts/examples/HashLockedSwap.sol/HashLockedSwap.json';
import testAssetHolderArtifact from '../artifacts/contracts/test/TESTAssetHolder.sol/TESTAssetHolder.json';
import testForceMoveArtifact from '../artifacts/contracts/test/TESTForceMove.sol/TESTForceMove.json';
import testNitroAdjudicatorArtifact from '../artifacts/contracts/test/TESTNitroAdjudicator.sol/TESTNitroAdjudicator.json';
import tokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import trivialAppArtifact from '../artifacts/contracts/TrivialApp.sol/TrivialApp.json';
import adjudicatorFactoryArtifact from '../artifacts/contracts/ninja-nitro/AdjudicatorFactory.sol/AdjudicatorFactory.json';
import singleChannelAdjudicatorArtifact from '../artifacts/contracts/ninja-nitro/SingleChannelAdjudicator.sol/SingleChannelAdjudicator.json';

export async function deploy(): Promise<Record<string, string>> {
  const deployer = new GanacheDeployer(Number(process.env.GANACHE_PORT));

  const nitroAdjudicatorDeploymentGas = await deployer.etherlimeDeployer.estimateGas(
    nitroAdjudicatorArtifact as any
  );
  writeGasConsumption('NitroAdjudicator.gas.md', 'deployment', nitroAdjudicatorDeploymentGas);
  console.log(
    `\nDeploying NitroAdjudicator... (cost estimated to be ${nitroAdjudicatorDeploymentGas})\n`
  );
  const NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(nitroAdjudicatorArtifact as any);

  const COUNTING_APP_ADDRESS = await deployer.deploy(countingAppArtifact as any);
  const HASH_LOCK_ADDRESS = await deployer.deploy(hashLockedSwapArtifact as any);
  const SINGLE_ASSET_PAYMENT_ADDRESS = await deployer.deploy(singleAssetPaymentsArtifact as any);
  const TEST_NITRO_ADJUDICATOR_ADDRESS = await deployer.deploy(testNitroAdjudicatorArtifact as any);
  const TRIVIAL_APP_ADDRESS = await deployer.deploy(trivialAppArtifact as any);
  const TEST_FORCE_MOVE_ADDRESS = await deployer.deploy(testForceMoveArtifact as any);
  const TEST_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    testAssetHolderArtifact as any,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  const TEST_ASSET_HOLDER2_ADDRESS = await deployer.deploy(
    testAssetHolderArtifact as any,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );

  // for test purposes in this package, wire up the assetholders with the testNitroAdjudicator

  const TEST_TOKEN_ADDRESS = await deployer.deploy(
    tokenArtifact as any,
    {},
    new Wallet(ETHERLIME_ACCOUNTS[0].privateKey).address
  );
  const ETH_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    ethAssetHolderArtifact as any,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  const ETH_ASSET_HOLDER2_ADDRESS = await deployer.deploy(
    ethAssetHolderArtifact as any,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS
  );
  const TEST_TOKEN_ASSET_HOLDER_ADDRESS = await deployer.deploy(
    erc20AssetHolderArtifact as any,
    {},
    TEST_NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS
  );
  const ADJUDICATOR_FACTORY_ADDRESS = await deployer.deploy(adjudicatorFactoryArtifact as any);
  const SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS = await deployer.deploy(
    singleChannelAdjudicatorArtifact as any,
    {},
    ADJUDICATOR_FACTORY_ADDRESS
  );

  const provider = getTestProvider();

  const AdjudicatorFactory = await setupContracts(
    provider,
    adjudicatorFactoryArtifact,
    ADJUDICATOR_FACTORY_ADDRESS
  );

  await (await AdjudicatorFactory.setup(SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS)).wait();

  return {
    NITRO_ADJUDICATOR_ADDRESS,
    COUNTING_APP_ADDRESS,
    HASH_LOCK_ADDRESS,
    SINGLE_ASSET_PAYMENT_ADDRESS,
    TRIVIAL_APP_ADDRESS,
    TEST_FORCE_MOVE_ADDRESS,
    TEST_NITRO_ADJUDICATOR_ADDRESS,
    TEST_TOKEN_ADDRESS,
    ETH_ASSET_HOLDER_ADDRESS,
    ETH_ASSET_HOLDER2_ADDRESS,
    TEST_TOKEN_ASSET_HOLDER_ADDRESS,
    TEST_ASSET_HOLDER_ADDRESS,
    TEST_ASSET_HOLDER2_ADDRESS,
    // SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS,
    ADJUDICATOR_FACTORY_ADDRESS,
  };
}
