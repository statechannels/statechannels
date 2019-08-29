import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTNitroAdjudicator.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder, toUtf8Bytes} from 'ethers/utils';
import {
  setupContracts,
  sign,
  newConcludedEvent,
  clearedChallengeHash,
  ongoingChallengeHash,
  finalizedOutcomeHash,
} from '../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;
const chainId = 1234;
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 1000;
const outcome = ethers.utils.id('some outcome data'); // use a fixed outcome for all state updates in all tests
const outcomeHash = keccak256(defaultAbiCoder.encode(['bytes'], [outcome]));
let appDefinition;

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}
beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

const description1 =
  'It accepts a valid concludeFromOpen tx (n states) and sets the channel storage correctly';
const description2 =
  'It accepts a valid concludeFromOpen tx (1 state) and sets the channel storage correctly';
const description3 =
  'It accepts a valid concludeFromOpen tx (1 state, cleared challenge exists) and sets the channel storage correctly';
const description4 =
  'It reverts a concludeFromOpen tx when the declaredTurnNumRecord = 0 and incorrect';
const description5 =
  'It reverts a concludeFromOpen tx when the declaredTurnNumRecord > 0 and incorrect';
const description6 = 'It reverts a concludeFromOpen tx when there is an ongoing challenge';
const description7 = 'It reverts a concludeFromOpen tx when the outcome is already finalized';

describe('concludeFromOpen', () => {
  it.each`
    description     | channelNonce | declaredTurnNumRecord | initialChannelStorageHash  | largestTurnNum | numStates | whoSignedWhat | reasonString
    ${description1} | ${401}       | ${0}                  | ${HashZero}                | ${8}           | ${3}      | ${[0, 1, 2]}  | ${undefined}
    ${description2} | ${402}       | ${0}                  | ${HashZero}                | ${8}           | ${1}      | ${[0, 0, 0]}  | ${undefined}
    ${description3} | ${403}       | ${5}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${undefined}
    ${description4} | ${404}       | ${0}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description5} | ${405}       | ${1}                  | ${clearedChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description6} | ${406}       | ${5}                  | ${ongoingChallengeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
    ${description7} | ${407}       | ${5}                  | ${finalizedOutcomeHash(5)} | ${8}           | ${1}      | ${[0, 0, 0]}  | ${'Channel is not open or turnNum does not match'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      declaredTurnNumRecord,
      initialChannelStorageHash,
      largestTurnNum,
      numStates,
      whoSignedWhat,
      reasonString,
    }) => {
      // compute channelId
      const channelId = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address[]', 'uint256'],
          [chainId, participants, channelNonce],
        ),
      );
      // fixedPart
      const fixedPart = {
        chainId,
        participants,
        channelNonce,
        appDefinition,
        challengeDuration,
      };

      const appPartHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address'], // note lack of appData
          [challengeDuration, appDefinition],
        ),
      );

      // compute stateHashes
      const stateHashes = new Array(numStates);
      for (let i = 0; i < numStates; i++) {
        const state = {
          turnNum: largestTurnNum + i - numStates,
          isFinal: true,
          channelId,
          appPartHash,
          outcomeHash,
        };
        stateHashes[i] = keccak256(
          defaultAbiCoder.encode(
            [
              'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 appPartHash, bytes32 outcomeHash)',
            ],
            [state],
          ),
        );
      }

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, initialChannelStorageHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(initialChannelStorageHash);

      // sign the states
      const sigs = new Array(participants.length);
      for (let i = 0; i < participants.length; i++) {
        const sig = await sign(wallets[i], stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ForceMove.concludeFromOpen(
              declaredTurnNumRecord,
              largestTurnNum,
              fixedPart,
              appPartHash,
              outcomeHash,
              numStates,
              whoSignedWhat,
              sigs,
            ),
          regex,
        );
      } else {
        const concludedEvent: any = newConcludedEvent(ForceMove, channelId);
        const tx2 = await ForceMove.concludeFromOpen(
          declaredTurnNumRecord,
          largestTurnNum,
          fixedPart,
          appPartHash,
          outcomeHash,
          numStates,
          whoSignedWhat,
          sigs,
        );

        // wait for tx to be mined
        await tx2.wait();

        // catch Concluded event
        const [eventChannelId] = await concludedEvent;
        expect(eventChannelId).toBeDefined();

        // compute expected ChannelStorageHash
        const blockNumber = await provider.getBlockNumber();
        const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
        const expectedChannelStorage = [0, blockTimestamp, HashZero, AddressZero, outcomeHash];
        const expectedChannelStorageHash = keccak256(
          defaultAbiCoder.encode(
            ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
            expectedChannelStorage,
          ),
        );

        // check channelStorageHash against the expected value
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
