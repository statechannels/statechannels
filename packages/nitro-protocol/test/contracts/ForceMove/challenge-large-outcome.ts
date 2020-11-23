import {configureEnvVariables, expectRevert, GanacheServer} from '@statechannels/devtools';
import {Contract, Wallet, ethers, Signature} from 'ethers';

const {HashZero} = ethers.constants;
const {defaultAbiCoder, hexlify} = ethers.utils;
import ForceMoveArtifact from '../../../artifacts/contracts/test/TESTForceMove.sol/TESTForceMove.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {getFixedPart, getVariablePart, State} from '../../../src/contract/state';
import {Outcome, SignedState} from '../../../src/index';
import {signChallengeMessage, signState, signStates} from '../../../src/signatures';
import {
  getPlaceHolderContractAddress,
  getRandomNonce,
  getTestProvider,
  randomExternalDestination,
  setupContracts,
  writeGasConsumption,
} from '../../test-helpers';

// run with node --max_old_space_size=8192 -r ts-node/register ./test/contracts/ForceMove/challenge-large-outcome.ts
configureEnvVariables();

import {deploy} from '../../../deployment/deploy';

const provider = getTestProvider();

let ForceMove: Contract;

const chainId = process.env.CHAIN_NETWORK_ID;
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 86400; // 1 day

const randomDestination = randomExternalDestination();
const randomAddress = Wallet.createRandom().address;

const largeOutcome = (number: number): Outcome => [
  {
    allocationItems: Array(number).fill({destination: randomDestination, amount: '0x01'}),
    assetHolderAddress: randomAddress,
  },
];

const appDefinition = getPlaceHolderContractAddress();
const keys = [
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29',
  '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
  '0x1b7598002c59e7d9131d7e7c9d0ec48ed065a3ed04af56674497d6b0048f2d84',
];
// Populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = new Wallet(keys[i]);
  participants[i] = wallets[i].address;
}

// Scenarios are synonymous with channelNonce:
type StateData = {appDatas: number[]; whoSignedWhat: number[]; outcome: Outcome}; // Only used in this test
const largestTurnNum = 8;
const isFinalCount = 0;
const challenger = wallets[2];

const empty = HashZero; // Equivalent to openAtZero

async function main() {
  const ganacheServer = new GanacheServer(
    Number(process.env.GANACHE_PORT),
    Number(process.env.CHAIN_NETWORK_ID)
  );

  await ganacheServer.ready();

  const deployedArtifacts = await deploy();
  process.env = {...process.env, ...deployedArtifacts};

  ForceMove = await setupContracts(
    provider,
    ForceMoveArtifact,
    process.env.TEST_FORCE_MOVE_ADDRESS
  );

  let gas = 0;
  let num = 1000;
  while (gas < 8000000) {
    gas = await run(num, num);
    num++;
  }

  async function run(numAllocations, nonce) {
    const hugeOutcome: StateData = {
      appDatas: [2],
      whoSignedWhat: [0, 0, 0],
      outcome: largeOutcome(numAllocations),
    };

    const {appDatas, whoSignedWhat, outcome} = hugeOutcome;
    const channel: Channel = {
      chainId,
      participants,
      channelNonce: nonce,
    };
    const channelId = getChannelId(channel);

    const states: State[] = appDatas.map((data, idx) => ({
      turnNum: largestTurnNum - appDatas.length + 1 + idx,
      isFinal: idx > appDatas.length - isFinalCount,
      channel,
      challengeDuration,
      outcome,
      appDefinition,
      appData: defaultAbiCoder.encode(['uint256'], [data]),
    }));
    const variableParts = states.map(state => getVariablePart(state));
    const fixedPart = getFixedPart(states[0]);

    // Sign the states
    const signatures = await signStates(states, wallets, whoSignedWhat);
    const challengeState: SignedState = {
      state: states[states.length - 1],
      signature: {v: 0, r: '', s: '', _vs: '', recoveryParam: 0},
    };
    const challengeSignature = signChallengeMessage([challengeState], challenger.privateKey);

    // Set current channelStorageHashes value
    await (await ForceMove.setChannelStorageHash(channelId, empty)).wait();

    const tx = ForceMove.challenge(
      fixedPart,
      largestTurnNum,
      variableParts,
      isFinalCount,
      signatures,
      whoSignedWhat,
      challengeSignature
    );

    const receipt = await (await tx).wait();
    console.log(`${numAllocations} allocations:  ${receipt.gasUsed} gas`);

    await writeGasConsumption(
      './challenge.gas.md',
      `It copes with a large outcome with ${numAllocations} allocationItems`,
      receipt.gasUsed
    );
    return receipt.gasUsed;
  }
  await ganacheServer.close();
}

main();
