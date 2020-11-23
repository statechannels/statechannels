import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;

  const { deployer } = await getNamedAccounts();

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
