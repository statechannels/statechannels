import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: {deploy},
    getChainId,
    getNamedAccounts,
  } = hre;

  const chainId = await getChainId();

  // This is the default hardhat network chainid
  if (chainId !== '31337') {
    console.info(`Skipping deployment of Token for chain with ID: ${chainId}`);
    return;
  }

  const {deployer} = await getNamedAccounts();

  await deploy('Token', {
    from: deployer,
    log: true,
    args: [deployer],
    deterministicDeployment: true,
  });
};
export default func;
func.tags = ['Token'];
