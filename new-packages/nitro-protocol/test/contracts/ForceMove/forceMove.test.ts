import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../../build/contracts/CountingApp.json';
import {defaultAbiCoder, hexlify} from 'ethers/utils';
import {HashZero} from 'ethers/constants';
import {
  setupContracts,
  nonParticipant,
  clearedChallengeHash,
  ongoingChallengeHash,
  newChallengeRegisteredEvent,
  sendTransaction,
  signStates,
  finalizedOutcomeHash,
} from '../../test-helpers';
import {Channel, getChannelId} from '../../../src/contract/channel';
import {State, getVariablePart, getFixedPart} from '../../../src/contract/state';
import {hashChannelStorage, ChannelStorage} from '../../../src/contract/channel-storage';
import {createForceMoveTransaction} from '../../../src/contract/transaction-creators/force-move';
import {
  TURN_NUM_RECORD_NOT_INCREASED,
  CHALLENGER_NON_PARTICIPANT,
  CHANNEL_FINALIZED,
} from '../../../src/contract/transaction-creators/revert-reasons';
const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;

const chainId = '0x1234';
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 0x1;
const outcome = [{allocation: [], assetHolderAddress: ethers.Wallet.createRandom().address}];

let appDefinition;

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}
// set event listener
let challengeRegisteredEvent;

beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

const acceptsWhenOpen = 'It accepts for an open channel, and updates storage correctly, ';
const accepts1 = acceptsWhenOpen + 'when the slot is empty, n states submitted';
const accepts2 = acceptsWhenOpen + 'when the slot is empty, 1 state submitted';
const accepts3 = acceptsWhenOpen + 'when the slot is not empty, n states submitted';
const accepts4 = acceptsWhenOpen + 'when the slot is not empty, 1 state submitted';

const acceptsWhenChallengePresent =
  'It accepts when a challenge is present, and updates storage correctly, ';
const accepts5 = acceptsWhenChallengePresent + 'when the turnNumRecord increases, 1 state';
const accepts6 = acceptsWhenChallengePresent + 'when the turnNumRecord increases, n states';

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

  let channelNonce = 200;
  beforeEach(() => (channelNonce += 1));
  it.each`
    description | initialChannelStorageHash   | stateData      | challenger        | reasonString
    ${accepts1} | ${HashZero}                 | ${oneState}    | ${wallets[2]}     | ${undefined}
    ${accepts2} | ${HashZero}                 | ${threeStates} | ${wallets[2]}     | ${undefined}
    ${accepts3} | ${clearedChallengeHash(5)}  | ${oneState}    | ${wallets[2]}     | ${undefined}
    ${accepts4} | ${clearedChallengeHash(5)}  | ${threeStates} | ${wallets[2]}     | ${undefined}
    ${accepts5} | ${ongoingChallengeHash(5)}  | ${oneState}    | ${wallets[2]}     | ${undefined}
    ${accepts6} | ${ongoingChallengeHash(5)}  | ${threeStates} | ${wallets[2]}     | ${undefined}
    ${reverts1} | ${clearedChallengeHash(20)} | ${oneState}    | ${wallets[2]}     | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts2} | ${HashZero}                 | ${oneState}    | ${nonParticipant} | ${CHALLENGER_NON_PARTICIPANT}
    ${reverts3} | ${HashZero}                 | ${invalid}     | ${wallets[2]}     | ${'CountingApp: Counter must be incremented'}
    ${reverts4} | ${ongoingChallengeHash(20)} | ${oneState}    | ${wallets[2]}     | ${TURN_NUM_RECORD_NOT_INCREASED}
    ${reverts5} | ${finalizedOutcomeHash(5)}  | ${oneState}    | ${wallets[2]}     | ${CHANNEL_FINALIZED}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce

    async ({initialChannelStorageHash, stateData, challenger, reasonString}) => {
      const {appDatas, whoSignedWhat} = stateData;
      const channel: Channel = {
        chainId,
        participants,
        channelNonce: hexlify(channelNonce),
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

      // sign the states
      // sign the states
      const sigs = await signStates(states, wallets, whoSignedWhat);

      // set current channelStorageHashes value
      await (await ForceMove.setChannelStorageHash(channelId, initialChannelStorageHash)).wait();

      const transactionRequest = createForceMoveTransaction(
        states,
        sigs,
        whoSignedWhat,
        challenger.privateKey,
      );
      // call forceMove in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );

        await expectRevert(() => {
          return sendTransaction(provider, ForceMove.address, transactionRequest);
        }, regex);
      } else {
        challengeRegisteredEvent = newChallengeRegisteredEvent(ForceMove, channelId);

        await sendTransaction(provider, ForceMove.address, transactionRequest);

        // catch ForceMove event
        const [
          eventChannelId,
          eventTurnNumRecord,
          eventFinalizesAt,
          eventChallenger,
          eventIsFinal,
          eventFixedPart,
          eventVariableParts,
        ] = await challengeRegisteredEvent;

        // check this information is enough to respond
        expect(eventChannelId).toEqual(channelId);
        expect(eventTurnNumRecord._hex).toEqual(hexlify(largestTurnNum));
        expect(eventChallenger).toEqual(challenger.address);
        expect(eventFixedPart[0]._hex).toEqual(hexlify(fixedPart.chainId));
        expect(eventFixedPart[1]).toEqual(fixedPart.participants);
        expect(eventFixedPart[2]._hex).toEqual(hexlify(fixedPart.channelNonce));
        expect(eventFixedPart[3]).toEqual(fixedPart.appDefinition);
        expect(eventFixedPart[4]._hex).toEqual(hexlify(fixedPart.challengeDuration));
        expect(eventIsFinal).toEqual(isFinalCount > 0);
        expect(eventVariableParts[eventVariableParts.length - 1][0]).toEqual(
          variableParts[variableParts.length - 1].outcome,
        );
        expect(eventVariableParts[eventVariableParts.length - 1][1]).toEqual(
          variableParts[variableParts.length - 1].appData,
        );

        const expectedChannelStorage: ChannelStorage = {
          turnNumRecord: largestTurnNum,
          finalizesAt: eventFinalizesAt,
          state: states[states.length - 1],
          challengerAddress: challenger.address,
          outcome,
        };
        const expectedChannelStorageHash = hashChannelStorage(expectedChannelStorage);

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
