import {CompiledContract, EtherlimeGanacheDeployer} from 'etherlime-lib';
import {colors} from 'etherlime-utils';
import {logger} from './logger';

export class GanacheDeployer {
  etherlimeDeployer: EtherlimeGanacheDeployer;

  constructor(port: number, privateKey?: string) {
    this.etherlimeDeployer = new EtherlimeGanacheDeployer(privateKey, port);
  }

  public async deploy(
    contract: CompiledContract,
    libraries: Record<string, string> = {},
    ...args: any[]
  ): Promise<string> {
    const deployedContract = await this.etherlimeDeployer.deploy(contract, libraries, ...args);
    logger.info(
      `Contract ${contract.contractName} deployed to ganache: ${colors.colorAddress(
        deployedContract.contractAddress
      )}`
    );
    return deployedContract.contractAddress;
  }
}
