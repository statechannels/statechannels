import {CompiledContract, EtherlimeGanacheDeployer} from 'etherlime-lib';
import * as log from 'loglevel';
// @ts-ignore etherlime-utils does not export any types
import {colors} from 'etherlime-utils';

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
    log.info(
      `Contract ${contract.contractName} deployed to ganache: ${colors.colorAddress(
        deployedContract.contractAddress
      )}`
    );
    return deployedContract.contractAddress;
  }
}
