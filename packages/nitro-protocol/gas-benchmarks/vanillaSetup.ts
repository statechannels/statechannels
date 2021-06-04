import {ContractFactory, Contract} from '@ethersproject/contracts';
import {GanacheServer} from '@statechannels/devtools';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import erc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';
import tokenArtifact from '../artifacts/contracts/Token.sol/Token.json';
import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
import {Transaction} from 'ethers';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toConsumeGas(benchmark: number): R;
    }
  }
}

export let ethAssetHolder: Contract;
export let erc20AssetHolder: Contract;
export let nitroAdjudicator: Contract;
export let token: Contract;
const ganacheServer = new GanacheServer(5555, 1);
let snapshotId = 0;

const ethAssetHolderFactory = new ContractFactory(
  ethAssetHolderArtifact.abi,
  ethAssetHolderArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

const tokenFactory = new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode).connect(
  ganacheServer.provider.getSigner(0)
);

const erc20AssetHolderFactory = new ContractFactory(
  erc20AssetHolderArtifact.abi,
  erc20AssetHolderArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

const nitroAdjudicatorFactory = new ContractFactory(
  nitroAdjudicatorArtifact.abi,
  nitroAdjudicatorArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

beforeAll(async () => {
  await ganacheServer.ready();
  nitroAdjudicator = await nitroAdjudicatorFactory.deploy();
  ethAssetHolder = await ethAssetHolderFactory.deploy(nitroAdjudicator.address);
  token = await tokenFactory.deploy(ganacheServer.provider.getSigner(0).getAddress());
  erc20AssetHolder = await erc20AssetHolderFactory.deploy(nitroAdjudicator.address, token.address);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
});

beforeEach(async () => {
  await ganacheServer.provider.send('evm_revert', [snapshotId]);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
});

afterAll(async () => {
  await ganacheServer.close();
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
