import {Interface, ParamType} from 'ethers/utils';
import {JsonRpcProvider} from 'ethers/providers';
import fs from 'fs';
import linker from 'solc/linker';
import path from 'path';
import easyTable from 'easy-table';

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

interface Options {
  contractArtifactFolder: string;
}

interface ParsedArtifact {
  abi: ParamType[];
  deployedBytecode: object;
  contractName: string;
  networks: {[networkName: string]: {address: string}};
}

interface GasConsumed {
  [contract: string]: ContractStats;
}

interface ContractStats {
  deployment: number;
  methods: {[method: string]: Stats};
}

interface Stats {
  calls: number;
  min: number;
  max: number;
  avg: number;
}
const gasConsumed: GasConsumed = {};
/* TODO: 
 - Handle failures gracefully
 - Organize and clean up
*/

export class GasReporter implements jest.Reporter {
  options: Options;
  provider: JsonRpcProvider;
  globalConfig: jest.GlobalConfig;
  startBlockNum = 0;

  constructor(globalConfig: jest.GlobalConfig, options: Options) {
    this.globalConfig = globalConfig;
    this.options = options;
    this.provider = new JsonRpcProvider(`http://localhost:${process.env.GANACHE_PORT || 8545}`);
  }

  onRunStart(): void {
    if (!this.options.contractArtifactFolder) {
      console.log(
        "The contractArtifactFolder was not set in options, assuming a default folder of '/build/contracts/'"
      );
      this.options.contractArtifactFolder = 'build/contracts';
    }
  }

  onRunComplete(): Promise<void> {
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

  async generateFinalResults(): Promise<void> {
    const endBlockNum = await this.provider.getBlockNumber();
    const contractCalls = await this.parseContractCalls(
      this.startBlockNum,
      endBlockNum,
      this.options.contractArtifactFolder
    );
    this.outputGasInfo(contractCalls);
    // if (process.env.CIRCLECI) {
    await this.saveResultsToFile(process.env.CIRCLE_SHA1);
    // }
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
      this.parseCode(parsedArtifact, contractCalls);
    });

    return contractCalls;
  }

  parseCode(parsedArtifact: ParsedArtifact, contractCalls: ContractCalls): void {
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

  parseInterfaceAndAddress(
    parsedArtifact: ParsedArtifact,
    networkId: number,
    contractCalls: ContractCalls
  ): void {
    // Only attempt to parse as a contract if we have a defined ABI and contractName
    if (parsedArtifact.abi && parsedArtifact.contractName) {
      const contractInterface = new Interface(parsedArtifact.abi);

      contractCalls[parsedArtifact.contractName] = {
        methodCalls: {},
        code: '',
        interface: contractInterface
      };

      if (parsedArtifact.networks[networkId]) {
        contractCalls[parsedArtifact.contractName].address =
          parsedArtifact.networks[networkId].address;
      }
    }
  }

  outputGasInfo(contractCalls: ContractCalls): void {
    for (const contractName of Object.keys(contractCalls)) {
      const contractStats: ContractStats = {
        deployment: 0,
        methods: {}
      };
      if (contractCalls[contractName].deploy) {
        const deployGas = contractCalls[contractName].deploy.gasData;

        if (deployGas[1] && deployGas[1] !== deployGas[0]) {
          throw new Error('Multiple deployments with differing gas costs detected!');
          // This shouldn't happen with our current workflow where contracts are deployed exactly once before tests are run.
        }
        contractStats.deployment = deployGas[0];
      }
      const methodCalls = contractCalls[contractName].methodCalls;
      Object.keys(methodCalls).forEach(methodName => {
        const method = methodCalls[methodName];
        const total = method.gasData.reduce((acc, datum) => acc + datum, 0);
        const average = Math.round(total / method.gasData.length);
        const min = Math.min(...method.gasData);
        const max = Math.max(...method.gasData);

        const stats: Stats = {calls: method.calls, min: min, max: max, avg: average};
        contractStats.methods[methodName] = stats;
      });

      if (contractStats.deployment > 0) {
        gasConsumed[contractName] = contractStats;
      }
    }

    console.log(this.objectToTable(gasConsumed).toString());
  }

  objectToTable(gasConsumed: GasConsumed): easyTable {
    const table = new easyTable();
    Object.keys(gasConsumed).forEach(contract => {
      const contractStats = gasConsumed[contract];
      table.cell('Contract', contract);
      table.cell('Deployment', contractStats.deployment);
      table.cell('Method', '*');
      table.cell('Calls', '*');
      table.cell('Min', '*');
      table.cell('Avg', '*');
      table.cell('Max', '*');
      table.newRow();
      Object.keys(contractStats.methods).forEach(method => {
        table.cell('Method', method);
        const methodStats = contractStats.methods[method];
        table.cell('Calls', methodStats.calls);
        table.cell('Min', methodStats.min);
        table.cell('Avg', methodStats.avg);
        table.cell('Max', methodStats.max);
        table.newRow();
      });
      table.newRow();
    });
    return table;
  }

  async parseBlock(blockNum: number, contractCalls: ContractCalls): Promise<void> {
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
                  calls: 0
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

  async saveResultsToFile(hash: string): Promise<void> {
    const results = {
      date: Date.now(),
      networkName: this.provider.network.name,
      revision: hash,
      gasConsumed
    };
    const resultsString = JSON.stringify(results, null, 4) + '\n';
    await fs.appendFile('./gas.json', resultsString, err => {
      if (err) throw err;
      console.log('Wrote json to gas.json');
    });
    await fs.appendFile(
      './gas.txt',
      '\n\n\ndate: ' +
        Date.now() +
        '\nnetworkName: ' +
        this.provider.network.name +
        '\nrevision: ' +
        hash +
        '\n' +
        this.objectToTable(gasConsumed).toString(),
      err => {
        if (err) throw err;
        console.log('Wrote table to gas.txt');
      }
    );
  }
}

module.exports = GasReporter;
