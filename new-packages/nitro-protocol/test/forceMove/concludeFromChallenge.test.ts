import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {setupContracts, sign, newConcludedEvent, clearedChallengeHash} from '../test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let ForceMove: ethers.Contract;
let networkId;
let blockNumber;
let blockTimestamp;
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
  'It accepts a valid concludeFromChallenge tx (n states) and sets the channel storage correctly';
const description2 =
  'It reverts a concludeFromChallenge tx when there is no challenge ongoing (turnNumRecord = 0)';
const description3 =
  'It reverts a concludeFromChallenge tx when there is no challenge ongoing (challenge cleared)';
const description4 = 'It reverts a concludeFromChallenge tx when the outcome is already finalized';

// Note: forceStorageHash will overrule the setTurnNumRecord and expired fields

describe('concludeFromChallenge', () => {
  it.each`
    description     | channelNonce | setTurnNumRecord | expired  | forceStorageHash           | declaredTurnNumRecord | largestTurnNum | numStates | whoSignedWhat | reasonString
    ${description1} | ${501}       | ${5}             | ${false} | ${undefined}               | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${undefined}
    ${description2} | ${502}       | ${0}             | ${false} | ${undefined}               | ${0}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'TurnNumRecord must be nonzero'}
    ${description3} | ${503}       | ${5}             | ${false} | ${clearedChallengeHash(5)} | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'Challenge State does not match stored version'}
    ${description4} | ${504}       | ${5}             | ${true}  | ${undefined}               | ${5}                  | ${8}           | ${3}      | ${[0, 1, 2]}  | ${'Channel already finalized!'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      setTurnNumRecord,
      expired,
      forceStorageHash,
      declaredTurnNumRecord,
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

      const challengeAppData = 0;
      const challengeAppPartHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes'],
          [
            challengeDuration,
            appDefinition,
            defaultAbiCoder.encode(['uint256'], [challengeAppData]),
          ],
        ),
      );

      const challengeState = {
        turnNum: setTurnNumRecord,
        isFinal: false, // TODO consider having this as a test parameter
        channelId,
        challengeAppPartHash,
        outcomeHash,
      };

      const challengeStateHash = keccak256(
        defaultAbiCoder.encode(
          [
            'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 challengeAppPartHash, bytes32 outcomeHash)',
          ],
          [challengeState],
        ),
      );

      // set expiry time in the future or in the past
      blockNumber = await provider.getBlockNumber();
      blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      const finalizesAt = expired
        ? blockTimestamp - challengeDuration
        : blockTimestamp + challengeDuration;

      // compute expected ChannelStorageHash
      const challengerAddress = wallets[2].address;
      const challengeExistsHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
          [setTurnNumRecord, finalizesAt, challengeStateHash, challengerAddress, outcomeHash],
        ),
      );

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(
        channelId,
        forceStorageHash ? forceStorageHash : challengeExistsHash,
      );
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(
        forceStorageHash ? forceStorageHash : challengeExistsHash,
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

      // sign the states
      const sigs = new Array(participants.length);
      for (let i = 0; i < participants.length; i++) {
        const sig = await sign(wallets[i], stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }

      // pack arguemtns
      const ChannelStorageLite =
        'tuple(uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';
      const channelStorageLiteBytes = defaultAbiCoder.encode(
        [ChannelStorageLite],
        [[finalizesAt, challengeStateHash, challengerAddress, outcomeHash]],
      );

      // call method in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ForceMove.concludeFromChallenge(
              declaredTurnNumRecord,
              largestTurnNum,
              fixedPart,
              appPartHash,
              numStates,
              whoSignedWhat,
              sigs,
              outcomeHash, // challengeOutcomeHash
              channelStorageLiteBytes,
            ),
          regex,
        );
      } else {
        const concludedEvent: any = newConcludedEvent(ForceMove, channelId);
        const tx2 = await ForceMove.concludeFromChallenge(
          declaredTurnNumRecord,
          largestTurnNum,
          fixedPart,
          appPartHash,
          numStates,
          whoSignedWhat,
          sigs,
          outcomeHash, // challengeOutcomeHash
          channelStorageLiteBytes,
        );

        // wait for tx to be mined
        await tx2.wait();

        // catch Concluded event
        const [eventChannelId] = await concludedEvent;
        expect(eventChannelId).toBeDefined();

        // compute expected ChannelStorageHash
        blockNumber = await provider.getBlockNumber();
        blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
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
