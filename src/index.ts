import { getGanacheProvider } from "magmo-devtools";
import { ethers, providers } from "ethers";
import fs from "fs";
import path from "path";
import easyTable from "easy-table";
import linker from "solc/linker";
interface MethodCalls {
  [methodName: string]: {
    gasData: number[];
    calls: number;
  };
}

interface ContractCalls {
  [contractName: string]: {
    interface: ethers.utils.Interface;
    address?: string;
    code: string;
    methodCalls: MethodCalls;
  };
}

/* TODO: 
 - Handle failures gracefully
 - Contract deployment costs (if possible?)
 - Refactor
*/

export class GasReporter implements jest.Reporter {
  options: any;
  provider: ethers.providers.JsonRpcProvider;
  globalConfig: any;
  startBlockNum: number;
  contractArtifactDirectory: string;

  constructor(globalConfig: any, options: any) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.provider = getGanacheProvider();
  }

  onRunStart(results: jest.AggregatedResult, options: jest.ReporterOnStartOptions): void {
    if (!this.options.contractArtifactFolder) {
      console.log("The contractArtifactFolder was not set in options, assuming a default folder of '/build/contracts/'");
      this.options.contractArtifactFolder = "build/contracts";
    }
    this.provider.getBlockNumber().then(blockNum => {
      // We know that the next block could contain relevant transactions
      this.startBlockNum = blockNum + 1;
    });
  }

  onRunComplete(contexts: jest.Set<jest.Context>, results: jest.AggregatedResult): Promise<void> {
    return new Promise((resolve, reject) => {
      this.generateFinalResults().then(() => {
        resolve();
      });
    });
  }

  async generateFinalResults() {
    const endBlockNum = await this.provider.getBlockNumber();
    const contractCalls = await this.parseContractCalls(this.startBlockNum, endBlockNum, this.options.contractArtifactFolder);
    this.outputGasInfo(contractCalls);
  }

  async parseContractCalls(startBlockNum: number, endBlockNum: number, contractFolder: string): Promise<ContractCalls> {
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
      const fileContent = fs.readFileSync(fileLocation, "utf8");
      const parsedArtifact = JSON.parse(fileContent);
      this.parseInterfaceAndAddress(parsedArtifact, networkId, contractCalls);
    });

    contractArtifacts.forEach((artifact: string) => {
      const fileLocation = path.join(contractFolder, artifact);
      const fileContent = fs.readFileSync(fileLocation, "utf8");
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
      const contractInterface = new ethers.utils.Interface(parsedArtifact.abi);

      contractCalls[parsedArtifact.contractName] = {
        methodCalls: {},
        code: "",
        interface: contractInterface,
      };

      if (parsedArtifact.networks[networkId]) {
        contractCalls[parsedArtifact.contractName].address = parsedArtifact.networks[networkId].address;
      }
    }
  }

  outputGasInfo(contractCalls: ContractCalls) {
    console.log();
    console.log("Gas Info:");
    const table = new easyTable();
    for (const contractName of Object.keys(contractCalls)) {
      const methodCalls = contractCalls[contractName].methodCalls;
      Object.keys(methodCalls).forEach(methodName => {
        const method = methodCalls[methodName];
        const total = method.gasData.reduce((acc, datum) => acc + datum, 0);
        const average = Math.round(total / method.gasData.length);
        const min = Math.min(...method.gasData);
        const max = Math.max(...method.gasData);
        table.cell("Contract Name", contractName);
        table.cell("Method Name", methodName);
        table.cell("Calls", method.calls);
        table.cell("Min Gas", min);
        table.cell("Max Gas", max);
        table.cell("Average Gas", average);
        table.newRow();
      });
    }

    console.log(table.toString());
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
          if (
            contractCall.code.localeCompare(code, undefined, {
              sensitivity: "base",
            }) === 0
          ) {
            const details = contractCall.interface.parseTransaction(transaction);
            if (details != null) {
              if (!contractCall.methodCalls[details.name]) {
                contractCall.methodCalls[details.name] = {
                  gasData: [],
                  calls: 0,
                };
              }
              contractCall.methodCalls[details.name].gasData.push(transactionReceipt.gasUsed.toNumber());
              contractCall.methodCalls[details.name].calls++;
            }
          }
        }
      }
    }
  }
}

module.exports = GasReporter;
