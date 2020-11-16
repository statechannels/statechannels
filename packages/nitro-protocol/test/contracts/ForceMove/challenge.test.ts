import {expectRevert} from '@statechannels/devtools';
import {Contract, Wallet, ethers} from 'ethers';

const {HashZero} = ethers.constants;
const {defaultAbiCoder, hexlify} = ethers.utils;

import ForceMoveArtifact from '../../../artifacts/contracts/test/TESTForceMove.sol/TESTForceMove.json';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {channelDataToChannelStorageHash, ChannelData} from '../../../src/contract/channel-storage';
import {getFixedPart, getVariablePart, State} from '../../../src/contract/state';
import {
  CHALLENGER_NON_PARTICIPANT,
  CHANNEL_FINALIZED,
  TURN_NUM_RECORD_DECREASED,
  TURN_NUM_RECORD_NOT_INCREASED,
} from '../../../src/contract/transaction-creators/revert-reasons';
import {SignedState} from '../../../src/index';
import {signChallengeMessage, signState, signStates} from '../../../src/signatures';
import {COUNTING_APP_INVALID_TRANSITION} from '../../revert-reasons';
import {
  clearedChallengeHash,
  finalizedOutcomeHash,
  getPlaceHolderContractAddress,
  getRandomNonce,
  getTestProvider,
  ongoingChallengeHash,
  setupContracts,
  writeGasConsumption,
} from '../../test-helpers';
import {createForceMoveTransaction} from '../../../src/transactions';

const provider = getTestProvider();

let ForceMove: Contract;

const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1;
const outcome = [{allocationItems: [], assetHolderAddress: Wallet.createRandom().address}];

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

const twoPartyChannel: Channel = {
  chainId: '0x1',
  channelNonce: 0x1,
  participants: [wallets[0].address, wallets[1].address],
};

async function createSignedCountingAppState(channel: Channel, appData: number, turnNum: number) {
  return await signState(
    {
      turnNum,
      isFinal: false,
      appDefinition: getPlaceHolderContractAddress(),
      appData: defaultAbiCoder.encode(['uint256'], [appData]),
      outcome: [],
      channel,
      challengeDuration: 0xfff,
    },
    wallets[turnNum % channel.participants.length].privateKey
  );
}
beforeAll(async () => {
  ForceMove = await setupContracts(
    provider,
    ForceMoveArtifact,
    process.env.TEST_FORCE_MOVE_ADDRESS
  );
});

// Scenarios are synonymous with channelNonce:

const acceptsWhenOpen = 'It accepts for an open channel, and updates storage correctly, ';
const accepts1 = acceptsWhenOpen + 'when the slot is empty, 1 state submitted';
const accepts2 = acceptsWhenOpen + 'when the slot is empty, 3 states submitted';
const accepts3 = acceptsWhenOpen + 'when the slot is not empty, 3 states submitted';
const accepts4 = acceptsWhenOpen + 'when the slot is not empty, 1 state submitted';

const acceptsWhenChallengePresent =
  'It accepts when a challenge is present, and updates storage correctly, ';
const accepts5 = acceptsWhenChallengePresent + 'when the turnNumRecord increases, 1 state';
const accepts6 = acceptsWhenChallengePresent + 'when the turnNumRecord increases, 3 states';

const revertsWhenOpenIf = 'It reverts for an open channel if ';
const reverts1 = revertsWhenOpenIf + 'the turnNumRecord does not increase';
const reverts2 = revertsWhenOpenIf + 'the challengerSig is incorrect';
const reverts3 = revertsWhenOpenIf + 'the states do not form a validTransition chain';

const reverts4 = 'It reverts when a challenge is present if the turnNumRecord does not increase';
const reverts5 = 'It reverts when the channel is finalized';

describe('forceMove', () => {
  const threeStates = {appDatas: [0, 1, 2], whoSignedWhat: [0, 1, 2]};
  const oneState = {appDatas: [2], whoSignedWhat: [0, 0, 0]};
  const invalid = {appDatas: [0, 2, 1], whoSignedWhat: [0, 1, 2]};
  const largestTurnNum = 8;
  const isFinalCount = 0;
  const challenger = wallets[2];
  const wrongSig = {v: 1, s: HashZero, r: HashZero};

  const empty = HashZero; // Equivalent to openAtZero
  const openAtFive = clearedChallengeHash(5);
  const openAtLargestTurnNum = clearedChallengeHash(largestTurnNum);
  const openAtTwenty = clearedChallengeHash(20);
  const challengeAtFive = ongoingChallengeHash(5);
  const challengeAtLargestTurnNum = ongoingChallengeHash(largestTurnNum);
  const challengeAtTwenty = ongoingChallengeHash(20);
  const finalizedAtFive = finalizedOutcomeHash(5);

  let channelNonce = getRandomNonce('challenge');
  beforeEach(() => (channelNonce += 1));
  it.each`
    description | initialChannelStorageHash    | stateData      | challengeSignature | reasonString
    ${accepts1} | ${empty}                     | ${oneState}    | ${undefined}       | ${undefined}
    ${accepts2} | ${empty}                     | ${threeStates} | ${undefined}       | ${undefined}
    ${accepts3} | ${openAtFive}                | ${oneState}    | ${undefined}       | ${undefined}
    ${accepts3} | ${openAtLargestTurnNum}      | ${oneState}    | ${undefined}       | ${undefined}
    ${accepts4} | ${openAtFive}                | ${threeStates} | ${undefined}       | ${undefined}
    ${accepts5} | ${challengeAtFive}           | ${oneState}    | ${undefined}       | ${undefined}
    ${accepts6} | ${challengeAtFive}           | ${threeStates} | ${undefined}       | ${undefined}
    ${reverts1} | ${openAtTwenty}              | ${oneState}    | ${undefined}       | ${TURN_NUM_RECORD_DECREASED}
    ${reverts2} | ${empty}                     | ${oneState}    | ${wrongSig}        | ${CHALLENGER_NON_PARTICIPANT}
    ${reverts3} | ${empty}                     | ${invalid}     | ${undefined}       | ${COUNTING_APP_INVALID_TRANSITION}
    ${reverts4} | ${challengeAtTwenty}         | ${oneState}    | ${undefined}       | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts4} | ${challengeAtLargestTurnNum} | ${oneState}    | ${undefined}       | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts5} | ${finalizedAtFive}           | ${oneState}    | ${undefined}       | ${CHANNEL_FINALIZED}
  `(
    '$description', // For the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce

    async ({
      description,
      initialChannelStorageHash,
      stateData,
      challengeSignature,
      reasonString,
    }) => {
      const {appDatas, whoSignedWhat} = stateData;
      const channel: Channel = {
        chainId,
        participants,
        channelNonce,
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
      challengeSignature =
        challengeSignature || signChallengeMessage([challengeState], challenger.privateKey);

      // Set current channelStorageHashes value
      await (await ForceMove.setChannelStorageHash(channelId, initialChannelStorageHash)).wait();

      const tx = ForceMove.challenge(
        fixedPart,
        largestTurnNum,
        variableParts,
        isFinalCount,
        signatures,
        whoSignedWhat,
        challengeSignature
      );
      if (reasonString) {
        await expectRevert(() => tx, reasonString);
      } else {
        const receipt = await (await tx).wait();
        await writeGasConsumption('./challenge.gas.md', description, receipt.gasUsed);
        const event = receipt.events.pop();

        // Catch ForceMove event
        const {
          channelId: eventChannelId,
          turnNumRecord: eventTurnNumRecord,
          finalizesAt: eventFinalizesAt,
          challenger: eventChallenger,
          isFinal: eventIsFinal,
          fixedPart: eventFixedPart,
          variableParts: eventVariableParts,
        } = event.args;

        // Check this information is enough to respond
        expect(eventChannelId).toEqual(channelId);
        expect(eventTurnNumRecord).toEqual(largestTurnNum);
        expect(eventChallenger).toEqual(challenger.address);
        expect(eventFixedPart[0]._hex).toEqual(hexlify(fixedPart.chainId));
        expect(eventFixedPart[1]).toEqual(fixedPart.participants);
        expect(eventFixedPart[2]).toEqual(fixedPart.channelNonce);
        expect(eventFixedPart[3]).toEqual(fixedPart.appDefinition);
        expect(eventFixedPart[4]).toEqual(fixedPart.challengeDuration);
        expect(eventIsFinal).toEqual(isFinalCount > 0);
        expect(eventVariableParts[eventVariableParts.length - 1][0]).toEqual(
          variableParts[variableParts.length - 1].outcome
        );
        expect(eventVariableParts[eventVariableParts.length - 1][1]).toEqual(
          variableParts[variableParts.length - 1].appData
        );

        const expectedChannelStorage: ChannelData = {
          turnNumRecord: largestTurnNum,
          finalizesAt: eventFinalizesAt,
          state: states[states.length - 1],
          challengerAddress: challenger.address,
          outcome,
        };
        const expectedChannelStorageHash = channelDataToChannelStorageHash(expectedChannelStorage);

        // Check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    }
  );
});

describe('forceMove with transaction generator', () => {
  beforeEach(async () => {
    await (await ForceMove.setChannelStorageHash(getChannelId(twoPartyChannel), HashZero)).wait();
  });
  afterEach(async () => {
    await (await ForceMove.setChannelStorageHash(getChannelId(twoPartyChannel), HashZero)).wait();
  });
  it.each`
    description                  | appData   | turnNums  | challenger
    ${'forceMove(0,1) accepted'} | ${[0, 0]} | ${[0, 1]} | ${1}
    ${'forceMove(1,2) accepted'} | ${[0, 0]} | ${[1, 2]} | ${0}
  `('$description', async ({description, appData, turnNums, challenger}) => {
    const transactionRequest: ethers.providers.TransactionRequest = createForceMoveTransaction(
      [
        await createSignedCountingAppState(twoPartyChannel, appData[0], turnNums[0]),
        await createSignedCountingAppState(twoPartyChannel, appData[1], turnNums[1]),
      ],
      wallets[challenger].privateKey
    );
    const signer = provider.getSigner();
    const transaction = {data: transactionRequest.data, gasLimit: 3000000};
    const response = await signer.sendTransaction({
      to: ForceMove.address,
      ...transaction,
    });
    expect(response).toBeDefined();
  });
});
