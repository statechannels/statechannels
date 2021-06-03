import {exec} from 'child_process';
import {promises, existsSync, truncateSync} from 'fs';

import {ContractFactory, Contract} from '@ethersproject/contracts';
import {providers} from 'ethers';
import waitOn from 'wait-on';

import nitroAdjudicatorArtifact from '../artifacts/contracts/NitroAdjudicator.sol/NitroAdjudicator.json';
import ethAssetHolderArtifact from '../artifacts/contracts/ETHAssetHolder.sol/ETHAssetHolder.json';
import erc20AssetHolderArtifact from '../artifacts/contracts/ERC20AssetHolder.sol/ERC20AssetHolder.json';
import tokenArtifact from '../artifacts/contracts/Token.sol/Token.json';

export let ethAssetHolder: Contract;
export let erc20AssetHolder: Contract;
export let nitroAdjudicator: Contract;
export let token: Contract;

const logFile = './hardhat-network-output.log';
const hardHatNetworkEndpoint = 'http://localhost:9546'; // the port should be unique

jest.setTimeout(15_000); // give hardhat network a chance to get going
if (existsSync(logFile)) truncateSync(logFile);
const hardhatProcess = exec('npx hardhat node --no-deploy --port 9546', (error, stdout, stderr) => {
  promises.appendFile(logFile, stdout);
});
const hardhatProcessExited = new Promise(resolve => hardhatProcess.on('exit', resolve));

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
  nitroAdjudicator = await nitroAdjudicatorFactory.deploy();
  ethAssetHolder = await ethAssetHolderFactory.deploy(nitroAdjudicator.address);
  token = await tokenFactory.deploy(provider.getSigner(0).getAddress());
  erc20AssetHolder = await erc20AssetHolderFactory.deploy(nitroAdjudicator.address, token.address);
  snapshotId = await provider.send('evm_snapshot', []);
});

beforeEach(async () => {
  await provider.send('evm_revert', [snapshotId]);
  snapshotId = await provider.send('evm_snapshot', []);
});

afterAll(async () => {
  hardhatProcess.kill('SIGINT');
  await hardhatProcessExited;
});
