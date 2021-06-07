import {exec} from 'child_process';
import {promises, existsSync, truncateSync} from 'fs';

import {ContractFactory, providers} from 'ethers';
import waitOn from 'wait-on';
import kill from 'tree-kill';
import {BigNumber} from '@ethersproject/bignumber';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import erc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';
import tokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import {NitroAdjudicator} from '../typechain/NitroAdjudicator';
import {ETHAssetHolder} from '../typechain/ETHAssetHolder';
import {ERC20AssetHolder} from '../typechain/ERC20AssetHolder';
import {Token} from '../typechain/Token';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toConsumeGas(benchmark: number): R;
    }
  }
}

export let ethAssetHolder: ETHAssetHolder;
export let erc20AssetHolder: ERC20AssetHolder;
export let nitroAdjudicator: NitroAdjudicator;
export let token: Token;

const logFile = './hardhat-network-output.log';
const hardHatNetworkEndpoint = 'http://localhost:9546'; // the port should be unique

jest.setTimeout(15_000); // give hardhat network a chance to get going
if (existsSync(logFile)) truncateSync(logFile);
const hardhatProcess = exec('npx hardhat node --no-deploy --port 9546', (error, stdout, stderr) => {
  promises.appendFile(logFile, stdout);
});
const hardhatProcessExited = new Promise(resolve => hardhatProcess.on('exit', resolve));
const hardhatProcessClosed = new Promise(resolve => hardhatProcess.on('close', resolve));

const provider = new providers.JsonRpcProvider(hardHatNetworkEndpoint);

let snapshotId = 0;

const ethAssetHolderFactory = new ContractFactory(
  ethAssetHolderArtifact.abi,
  ethAssetHolderArtifact.bytecode
).connect(provider.getSigner(0));

const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode).connect(
  provider.getSigner(0)
);

const erc20AssetHolderFactory = new ContractFactory(
  erc20AssetHolderArtifact.abi,
  erc20AssetHolderArtifact.bytecode
).connect(provider.getSigner(0));

const nitroAdjudicatorFactory = new ContractFactory(
  nitroAdjudicatorArtifact.abi,
  nitroAdjudicatorArtifact.bytecode
).connect(provider.getSigner(0));

beforeAll(async () => {
  await waitOn({resources: [hardHatNetworkEndpoint]});
  nitroAdjudicator = ((await nitroAdjudicatorFactory.deploy()) as unknown) as NitroAdjudicator;
  ethAssetHolder = ((await ethAssetHolderFactory.deploy(
    nitroAdjudicator.address
  )) as unknown) as ETHAssetHolder;
  token = ((await tokenFactory.deploy(provider.getSigner(0).getAddress())) as unknown) as Token;
  erc20AssetHolder = ((await erc20AssetHolderFactory.deploy(
    nitroAdjudicator.address,
    token.address
  )) as unknown) as ERC20AssetHolder;
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
    const {gasUsed} = await received.wait();
    const pass = (gasUsed as BigNumber).eq(benchmark); // This could get replaced with a looser check with upper/lower bounds
    if (pass) {
      return {
        message: () => `expected to NOT consume ${benchmark} gas, but did`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected to consume ${benchmark} gas, but actually consumed ${(gasUsed as BigNumber).toNumber()} gas. Consider updating the appropriate number in gas.ts!`,
        pass: false,
      };
    }
  },
});
