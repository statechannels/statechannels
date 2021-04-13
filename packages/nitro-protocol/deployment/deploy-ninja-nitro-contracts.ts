// NOTE: this script manages deploying contracts for testing purposes ONLY
// DO NOT USE THIS SCRIPT TO DEPLOY CONTRACTS TO PRODUCTION NETWORKS
import {GanacheDeployer} from '@statechannels/devtools';

import {getTestProvider, setupContracts, writeGasConsumption} from '../test/test-helpers';
import adjudicatorFactoryArtifact from '../artifacts/contracts/ninja-nitro/AdjudicatorFactory.sol/AdjudicatorFactory.json';
import singleChannelAdjudicatorArtifact from '../artifacts/contracts/ninja-nitro/SingleChannelAdjudicator.sol/SingleChannelAdjudicator.json';

export async function deploy(): Promise<Record<string, string>> {
  const deployer = new GanacheDeployer(Number(process.env.GANACHE_PORT));
  const ADJUDICATOR_FACTORY_ADDRESS = await deployer.deploy(adjudicatorFactoryArtifact as any);
  const adjudicatorFactoryDeploymentGas = await deployer.etherlimeDeployer.estimateGas(
    adjudicatorFactoryArtifact as any
  );
  writeGasConsumption('AdjudicatorFactory.gas.md', 'deployment', adjudicatorFactoryDeploymentGas);
  console.log(
    `\nDeploying AdjudicatorFactory... (cost estimated to be ${adjudicatorFactoryDeploymentGas})\n`
  );

  const SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS = await deployer.deploy(
    singleChannelAdjudicatorArtifact as any,
    {},
    ADJUDICATOR_FACTORY_ADDRESS // The mastercopy requires the adjudicator factory address as a constructor arg
    // It will be "baked into" the bytecode of the Mastercopy
  );

  const masterCopyDeploymentGas = await deployer.etherlimeDeployer.estimateGas(
    singleChannelAdjudicatorArtifact as any,
    {},
    ADJUDICATOR_FACTORY_ADDRESS as any
  );
  writeGasConsumption('MasterCopy.gas.md', 'deployment', masterCopyDeploymentGas);
  console.log(`\nDeploying MasterCopy... (cost estimated to be ${masterCopyDeploymentGas})\n`);

  // The following lines are not strictly part of deployment, but they constiture a crucial one-time setup
  // for the contracts. The factory needs to know the address of the mastercopy, and this is provided by calling
  // the setup method on the factory:
  const provider = getTestProvider();
  const AdjudicatorFactory = await setupContracts(
    provider,
    adjudicatorFactoryArtifact,
    ADJUDICATOR_FACTORY_ADDRESS
  );
  await (await AdjudicatorFactory.setup(SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS)).wait();

  return {
    SINGLE_CHANNEL_ADJUDICATOR_MASTERCOPY_ADDRESS,
    ADJUDICATOR_FACTORY_ADDRESS,
  };
}
