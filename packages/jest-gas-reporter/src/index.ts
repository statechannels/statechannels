import { getGanacheProvider } from "magmo-devtools";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import easyTable from "easy-table";
interface MethodCalls {
  [methodName: string]: {
    gasData: number[];
    calls: number;
  };
}

interface ContractCalls {
  [contractName: string]: {
    interface: ethers.utils.Interface;
    methodCalls: MethodCalls;
  };
}

/* TODO: 
 - Handle failures gracefully
 - Contract deployment costs (if possible?)
*/

export class GasReporter implements jest.Reporter {
  options: any;
  provider: ethers.providers.JsonRpcProvider;
  globalConfig: any;
  startBlockNum: number;
  contractCalls: ContractCalls = {};

  constructor(globalConfig: any, options: any) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.provider = getGanacheProvider();
    this.startBlockNum = 0;
    if (!options.contractArtifactFolder) {
      console.log(
        "The contractArtifactFolder was not set in options, assuming a default folder of '/build/contracts/'"
      );
      this.parseContractArtifactFolder("./build/contracts");
    } else {
      this.parseContractArtifactFolder(options.contractArtifactFolder);
    }
  }

  onRunStart(
    results: jest.AggregatedResult,
    options: jest.ReporterOnStartOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.provider.getBlockNumber().then(blockNum => {
        this.startBlockNum = blockNum;
        resolve();
      });
    });
  }

  onRunComplete(
    contexts: jest.Set<jest.Context>,
    results: jest.AggregatedResult
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.provider.getBlockNumber().then(blockNum => {
        this.parseAllBlocks(this.startBlockNum + 1, blockNum).then(() => {
          this.outputGasInfo(this.contractCalls);
          resolve();
        });
      });
    });
  }

  outputGasInfo(contractCalls: ContractCalls) {
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

  parseContractArtifactFolder(contractFolder: string) {
    const contractArtifacts = fs.readdirSync(contractFolder);
    contractArtifacts.forEach((artifact: string) => {
      const fileLocation = path.join(contractFolder, artifact);
      const fileContent = fs.readFileSync(fileLocation, "utf8");

      const parsedArtifact = JSON.parse(fileContent);
      // Only attempt to parse as a contract if we have a defined ABI and contractName
      if (parsedArtifact.abi && parsedArtifact.contractName) {
        const contractInterface = new ethers.utils.Interface(
          parsedArtifact.abi
        );
        this.contractCalls[parsedArtifact.contractName] = {
          methodCalls: {},
          interface: contractInterface,
        };
      }
    });
  }

  async parseAllBlocks(startBlockNum: number, endBlockNum: number) {
    for (let i = startBlockNum; i <= endBlockNum; i++) {
      await this.parseBlock(i);
    }
  }

  async parseBlock(blockNum: number) {
    const block = await this.provider.getBlock(blockNum);
    for (const transHash of block.transactions) {
      const transaction = await this.provider.getTransaction(transHash);
      const transactionReceipt = await this.provider.getTransactionReceipt(
        transHash
      );

      for (const contractName of Object.keys(this.contractCalls)) {
        const contractCall = this.contractCalls[contractName];
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
  }
}

module.exports = GasReporter;
