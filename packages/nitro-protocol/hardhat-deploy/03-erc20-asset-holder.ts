import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getChainId, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const chainId = await getChainId();

  // This is the default hardhat network chainid
  if (chainId !== '31337') {
    console.info(`Skipping deployment of ERC20AssetHolder for chain with ID: ${chainId}`);
    return;
  }

  const {deployer} = await getNamedAccounts();

  await deploy('ERC20AssetHolder', {
    from: deployer,
    log: true,
    args: [
      (await deployments.get('NitroAdjudicator')).address,
      (await deployments.get('Token')).address,
    ],
    deterministicDeployment: true,
  });
};
export default func;
func.tags = ['ERC20AssetHolder'];
