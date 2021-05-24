import {ContractFactory, Contract} from '@ethersproject/contracts';
import {GanacheServer} from '@statechannels/devtools';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';

export let ethAssetHolder: Contract;
export let nitroAdjudicator: Contract;
const ganacheServer = new GanacheServer(5555, 1);
let snapshotId = 0;

const ethAssetHolderFactory = new ContractFactory(
  ethAssetHolderArtifact.abi,
  ethAssetHolderArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

const nitroAdjudicatorFactory = new ContractFactory(
  nitroAdjudicatorArtifact.abi,
  nitroAdjudicatorArtifact.bytecode
).connect(ganacheServer.provider.getSigner(0));

beforeAll(async () => {
  await ganacheServer.ready();
  //   console.log('deploying contracts...');
  nitroAdjudicator = await nitroAdjudicatorFactory.deploy();
  ethAssetHolder = await ethAssetHolderFactory.deploy(nitroAdjudicator.address);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
  //   console.log('contracts deployed');
});

beforeEach(async () => {
  //   console.log('resetting local blockchain...');
  await ganacheServer.provider.send('evm_revert', [snapshotId]);
  snapshotId = await ganacheServer.provider.send('evm_snapshot', []);
  //   console.log('local blockchain reset');
});

afterAll(async () => {
  await ganacheServer.close();
});
