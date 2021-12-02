import {exec} from 'child_process';
import {promises, existsSync, truncateSync} from 'fs';

import {ContractFactory, Contract} from '@ethersproject/contracts';
import {ethers, providers} from 'ethers';
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

const logFile = './hardhat-network-output.log';
const hardHatNetworkEndpoint = 'http://localhost:9546'; // the port should be unique

jest.setTimeout(15_000); // give hardhat network a chance to get going
if (existsSync(logFile)) truncateSync(logFile);
const hardhatProcess = exec('npx hardhat node --no-deploy --port 9546', (error, stdout) => {
  promises.appendFile(logFile, stdout);
});
const hardhatProcessExited = new Promise(resolve => hardhatProcess.on('exit', resolve));
const hardhatProcessClosed = new Promise(resolve => hardhatProcess.on('close', resolve));

export const provider = new providers.JsonRpcProvider(hardHatNetworkEndpoint);

let snapshotId = 0;

const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode).connect(
  provider.getSigner(0)
);

const nitroAdjudicatorFactory = new ContractFactory(
  nitroAdjudicatorArtifact.abi,
  nitroAdjudicatorArtifact.bytecode
).connect(provider.getSigner(0));

beforeAll(async () => {
  await waitOn({resources: [hardHatNetworkEndpoint]});
  nitroAdjudicator = (await nitroAdjudicatorFactory.deploy()) as NitroAdjudicator & Contract;
  token = (await tokenFactory.deploy(provider.getSigner(0).getAddress())) as Token & Contract;
  snapshotId = await provider.send('evm_snapshot', []);
});

beforeEach(async () => {
  await provider.send('evm_revert', [snapshotId]);
  snapshotId = await provider.send('evm_snapshot', []);
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
    const nx = ethers.utils.hexDataLength(received.data); // ideally this would only count nonzero bytes
    console.log(
      'tx has ' + nx,
      ' bytes of calldata (possibly including zeros): if EIP-4488 were merged, the gas used would decrease by ',
      nx * (16 - 3),
      'or ',
      (100 * nx * (16 - 3)) / benchmark,
      '%'
    );
    const {gasUsed: gasUsedBN} = await received.wait();
    const gasUsed = (gasUsedBN as BigNumber).toNumber();

    const pass = gasUsed === benchmark; // This could get replaced with a looser check with upper/lower bounds

    if (pass) {
      return {
        message: () => `expected to NOT consume ${benchmark} gas, but did`,
        pass: true,
      };
    } else {
      const format = (x: number) => {
        return x.toLocaleString().replace(/,/g, '_');
      };
      const green = (x: string) => `\x1b[32m${x}\x1b[0m`;
      const red = (x: string) => `\x1b[31m${x}\x1b[0m`;

      const diff = gasUsed - benchmark;
      const diffStr: string = diff > 0 ? red('+' + format(diff)) : green(format(diff));
      const diffPercent = `${Math.round((Math.abs(diff) / benchmark) * 100)}%`;

      return {
        message: () =>
          `expected to consume ${format(benchmark)} gas, but actually consumed ${format(
            gasUsed
          )} gas (${diffStr}, ${diffPercent}). Consider updating the appropriate number in gas.ts!`,
        pass: false,
      };
    }
  },
});
