import {ContractFactory, Contract} from '@ethersproject/contracts';
import {GanacheServer} from '@statechannels/devtools';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import erc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';

import {tokenAddress} from './fixtures';

export let ethAssetHolder: Contract;
export let erc20AssetHolder: Contract;
export let nitroAdjudicator: Contract;
const ganacheServer = new GanacheServer(5555, 1);
let snapshotId = 0;

const ethAssetHolderFactory = new ContractFactory(
  ethAssetHolderArtifact.abi,
  ethAssetHolderArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

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
  erc20AssetHolder = await erc20AssetHolderFactory.deploy(nitroAdjudicator.address, tokenAddress);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
});

beforeEach(async () => {
  await ganacheServer.provider.send('evm_revert', [snapshotId]);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
});

afterAll(async () => {
  await ganacheServer.close();
});
