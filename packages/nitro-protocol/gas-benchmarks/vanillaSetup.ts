import {exec} from 'child_process';
import {promises, existsSync, truncateSync} from 'fs';

import {ContractFactory, Contract} from '@ethersproject/contracts';
import {providers} from 'ethers';
import waitOn from 'wait-on';
import kill from 'tree-kill';
import {BigNumber} from '@ethersproject/bignumber';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import tokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import {NitroAdjudicator} from '../typechain/NitroAdjudicator';
import {Token} from '../typechain/Token';
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toConsumeGas(benchmark: number): R;
    }
  }
}

export let nitroAdjudicator: NitroAdjudicator & Contract;
export let token: Token & Contract;

const logFile = __dirname + '/hardhat-network-output.log';
const hardHatNetworkEndpoint = 'http://localhost:8545'; // the port should be unique

jest.setTimeout(5_000); // give hardhat network a chance to get going
if (existsSync(logFile)) truncateSync(logFile);
const hardhatProcess = exec(
  // 'docker run -it -p 8545:8545 ethereum/client-go --dev --http',
  'geth --dev --http --http.api personal,eth,net,web3,debug --verbosity 3', // an empemeral PoA blockchain
  (error, stdout, stderr) => {
    promises.appendFile(logFile, stdout);
    promises.appendFile(logFile, stderr);
  }
);
const hardhatProcessExited = new Promise(resolve => hardhatProcess.on('exit', resolve));
const hardhatProcessClosed = new Promise(resolve => hardhatProcess.on('close', resolve));

export const provider = new providers.StaticJsonRpcProvider(hardHatNetworkEndpoint);

let snapshotId;

const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode).connect(
  provider.getSigner(0)
);

const nitroAdjudicatorFactory = new ContractFactory(
  nitroAdjudicatorArtifact.abi,
  nitroAdjudicatorArtifact.bytecode
).connect(provider.getSigner(0));

beforeAll(async () => {
  // await waitOn({resources: [hardHatNetworkEndpoint]}); // waitOn doesn't seem to work with geth
  // console.log('network ready');
  nitroAdjudicator = (await nitroAdjudicatorFactory.deploy()) as NitroAdjudicator & Contract;
  token = (await tokenFactory.deploy(provider.getSigner(0).getAddress())) as Token & Contract;
  snapshotId = await provider.send('eth_blockNumber', []);
  console.log(snapshotId);
});

beforeEach(async () => {
  if (snapshotId) await provider.send('debug_setHead', [snapshotId]);
});

afterAll(async () => {
  await kill(hardhatProcess.pid);
  await hardhatProcessExited;
  await hardhatProcessClosed;
});

expect.extend({
  async toConsumeGas(
    received: any, // TransactionResponse
    benchmark: number
  ) {
    const {gasUsed} = await received.wait();
    const pass = (gasUsed as BigNumber).eq(benchmark); // This could get replaced with a looser check with upper/lower bounds
    if (pass) {
      return {
        message: () => `expected to NOT consume ${benchmark} gas, but did`,
        pass: true,
      };
    } else {
      const diff: BigNumber = (gasUsed as BigNumber).sub(benchmark);
      const diffStr: string = diff.gt(0) ? '+' + diff.toString() : diff.toString();
      return {
        message: () =>
          `expected to consume ${benchmark} gas, but actually consumed ${(gasUsed as BigNumber).toNumber()} gas (${diffStr}). Consider updating the appropriate number in gas.ts!`,
        pass: false,
      };
    }
  },
});
