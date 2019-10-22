import easyTable from 'easy-table';
import {JsonRpcProvider} from 'ethers/providers';
import {Interface} from 'ethers/utils';
import fs from 'fs';
import path from 'path';
import linker from 'solc/linker';
interface MethodCalls {
  [methodName: string]: {
    gasData: number[];
    calls: number;
  };
}

interface ContractCalls {
  [contractName: string]: {
    interface: Interface;
    address?: string;
    code: string;
    methodCalls: MethodCalls;
    deploy?: {
      gasData: number[];
      calls: number;
    };
  };
}

/* TODO: 
 - Handle failures gracefully
 - Organize and clean up
*/

export class GasReporter implements jest.Reporter {
  options: any;
  provider: JsonRpcProvider;
  globalConfig: any;
  startBlockNum: number;
  contractArtifactDirectory: string;

  constructor(globalConfig: any, options: any) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.provider = new JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT || 8545}`);
  }

  onRunStart(results: jest.AggregatedResult, options: jest.ReporterOnStartOptions): void {
    if (!this.options.contractArtifactFolder) {
      console.log(
        "The contractArtifactFolder was not set in options, assuming a default folder of '/build/contracts/'"
      );
      this.options.contractArtifactFolder = 'build/contracts';
    }
    this.provider
      .getBlockNumber()
      .then(blockNum => {
        // We know that the next block could contain relevant transactions
        this.startBlockNum = blockNum + 1;
      })
      .catch(e => {
        throw e;
      });
  }

  onRunComplete(contexts: jest.Set<jest.Context>, results: jest.AggregatedResult): Promise<void> {
    return new Promise((resolve, reject) => {
      this.generateFinalResults()
        .then(() => {
          resolve();
        })
        .catch(e => {
          reject(e);
        });
    });
  }

  async generateFinalResults() {
    const endBlockNum = await this.provider.getBlockNumber();
    const contractCalls = await this.parseContractCalls(
      this.startBlockNum,
      endBlockNum,
      this.options.contractArtifactFolder
    );
    this.outputGasInfo(contractCalls);
  }

  async parseContractCalls(
    startBlockNum: number,
    endBlockNum: number,
    contractFolder: string
  ): Promise<ContractCalls> {
    const networkId = (await this.provider.getNetwork()).chainId;
    const contractCalls = await this.parseContractArtifactFolder(contractFolder, networkId);
    for (let i = startBlockNum; i <= endBlockNum; i++) {
      await this.parseBlock(i, contractCalls);
    }
    return contractCalls;
  }

  parseContractArtifactFolder(contractFolder: string, networkId: number): ContractCalls {
    const contractCalls: ContractCalls = {};
    const contractArtifacts = fs.readdirSync(contractFolder);

    contractArtifacts.forEach((artifact: string) => {
      const fileLocation = path.join(contractFolder, artifact);
      const fileContent = fs.readFileSync(fileLocation, 'utf8');
      const parsedArtifact = JSON.parse(fileContent);
      this.parseInterfaceAndAddress(parsedArtifact, networkId, contractCalls);
    });

    contractArtifacts.forEach((artifact: string) => {
      const fileLocation = path.join(contractFolder, artifact);
      const fileContent = fs.readFileSync(fileLocation, 'utf8');
      const parsedArtifact = JSON.parse(fileContent);
      this.parseCode(parsedArtifact, contractCalls);
    });

    return contractCalls;
  }

  parseCode(parsedArtifact: any, contractCalls: ContractCalls) {
    const lookup = {};
    for (const contractName of Object.keys(contractCalls)) {
      if (contractCalls[contractName].address) {
        lookup[contractName] = contractCalls[contractName].address;
      }
    }

    if (parsedArtifact.deployedBytecode) {
      const linkedCode = linker.linkBytecode(parsedArtifact.deployedBytecode, lookup);
      contractCalls[parsedArtifact.contractName].code = linkedCode;
    }
  }

  parseInterfaceAndAddress(parsedArtifact: any, networkId: number, contractCalls: ContractCalls) {
    // Only attempt to parse as a contract if we have a defined ABI and contractName
    if (parsedArtifact.abi && parsedArtifact.contractName) {
      const contractInterface = new Interface(parsedArtifact.abi);

      contractCalls[parsedArtifact.contractName] = {
        methodCalls: {},
        code: '',
        interface: contractInterface,
      };

      if (parsedArtifact.networks[networkId]) {
        contractCalls[parsedArtifact.contractName].address =
          parsedArtifact.networks[networkId].address;
      }
    }
  }

  outputGasInfo(contractCalls: ContractCalls) {
    console.log();
    console.log('Gas Info:');
    console.log();
    console.log('Function Calls:');
    const methodTable = new easyTable();
    for (const contractName of Object.keys(contractCalls)) {
      const methodCalls = contractCalls[contractName].methodCalls;
      Object.keys(methodCalls).forEach(methodName => {
        const method = methodCalls[methodName];
        const total = method.gasData.reduce((acc, datum) => acc + datum, 0);
        const average = Math.round(total / method.gasData.length);
        const min = Math.min(...method.gasData);
        const max = Math.max(...method.gasData);
        methodTable.cell('Contract Name', contractName);
        methodTable.cell('Method Name', methodName);
        methodTable.cell('Calls', method.calls);
        methodTable.cell('Min Gas', min);
        methodTable.cell('Max Gas', max);
        methodTable.cell('Average Gas', average);
        methodTable.newRow();
      });
    }
    console.log(methodTable.toString());
    console.log('Deployments:');
    const deployTable = new easyTable();
    for (const contractName of Object.keys(contractCalls)) {
      if (contractCalls[contractName].deploy) {
        const deploy = contractCalls[contractName].deploy;

        const total = deploy.gasData.reduce((acc, datum) => acc + datum, 0);
        const average = Math.round(total / deploy.gasData.length);
        const min = Math.min(...deploy.gasData);
        const max = Math.max(...deploy.gasData);

        deployTable.cell('Contract Name', contractName);
        deployTable.cell('Deployments', deploy.calls);
        deployTable.cell('Min Gas', min);
        deployTable.cell('Max Gas', max);
        deployTable.cell('Average Gas', average);
        deployTable.newRow();
      }
    }
    console.log(deployTable.toString());
  }

  async parseBlock(blockNum: number, contractCalls: ContractCalls) {
    const block = await this.provider.getBlock(blockNum);
    for (const transHash of block.transactions) {
      const transaction = await this.provider.getTransaction(transHash);
      const transactionReceipt = await this.provider.getTransactionReceipt(transHash);

      if (transaction.to) {
        const code = await this.provider.getCode(transaction.to);

        for (const contractName of Object.keys(contractCalls)) {
          const contractCall = contractCalls[contractName];
          if (contractCall.code.localeCompare(code, undefined, {sensitivity: 'base'}) === 0) {
            const details = contractCall.interface.parseTransaction(transaction);

            if (details != null) {
              if (!contractCall.methodCalls[details.name]) {
                contractCall.methodCalls[details.name] = {
                  gasData: [],
                  calls: 0,
                };
              }
              contractCall.methodCalls[details.name].gasData.push(
                transactionReceipt.gasUsed.toNumber()
              );
              contractCall.methodCalls[details.name].calls++;
            }
          }
        }
      } else if (transactionReceipt.contractAddress) {
        const code = await this.provider.getCode(transactionReceipt.contractAddress);

        for (const contractName of Object.keys(contractCalls)) {
          const contractCall = contractCalls[contractName];
          if (contractCall.code.localeCompare(code, undefined, {sensitivity: 'base'}) === 0) {
            if (!contractCall.deploy) {
              contractCall.deploy = {calls: 0, gasData: []};
            }
            contractCall.deploy.calls++;
            contractCall.deploy.gasData.push(transactionReceipt.gasUsed.toNumber());
          }
        }
      }
    }
  }
}

module.exports = GasReporter;
