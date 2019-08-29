import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTNitroAdjudicator.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder, hexlify, toUtf8Bytes} from 'ethers/utils';
import {setupContracts, sign, newChallengeClearedEvent} from '../test-helpers';
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

const description1 = 'It accepts a valid respondWithAlternative tx and clears the challenge';
const description2 =
  'It reverts a respondWithAlternative tx when largestTurnNum =/= setTurnNum + 1';
const description3 = 'It reverts a respondWithAlternative tx for an expired challenge';
const description4 =
  'It reverts a respondWithAlternative tx when the states do not form a validTransition chain ';
const description5 =
  'It reverts a respondWithAlternative tx when an unacceptable whoSignedWhat array is submitted';

describe('respondWithAlternative', () => {
  it.each`
    description     | channelNonce | setTurnNumRecord | expired  | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger    | reasonString
    ${description1} | ${301}       | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${undefined}
    ${description2} | ${302}       | ${8}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Challenge State does not match stored version'}
    ${description3} | ${303}       | ${8}             | ${true}  | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]} | ${'Response too late!'}
    ${description4} | ${304}       | ${7}             | ${false} | ${8}           | ${[0, 2, 1]} | ${0}         | ${[0, 1, 2]}  | ${wallets[1]} | ${'CountingApp: Counter must be incremented'}
    ${description5} | ${305}       | ${7}             | ${false} | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 0, 2]}  | ${wallets[1]} | ${'Unacceptable whoSignedWhat array'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      setTurnNumRecord,
      expired,
      largestTurnNum,
      appDatas,
      isFinalCount,
      whoSignedWhat,
      challenger,
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

      const challengeAppPartHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes'],
          [challengeDuration, appDefinition, defaultAbiCoder.encode(['uint256'], [appDatas[0]])],
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

      // compute stateHashes
      const variableParts = new Array(appDatas.length);
      const stateHashes = new Array(appDatas.length);
      for (let i = 0; i < appDatas.length; i++) {
        variableParts[i] = {
          outcome, // fixed
          appData: defaultAbiCoder.encode(['uint256'], [appDatas[i]]),
        };
        const appPartHash = keccak256(
          defaultAbiCoder.encode(
            ['uint256', 'address', 'bytes'],
            [challengeDuration, appDefinition, defaultAbiCoder.encode(['uint256'], [appDatas[i]])],
          ),
        );
        const state = {
          turnNum: largestTurnNum - appDatas.length + 1 + i,
          isFinal: i > appDatas.length - isFinalCount,
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

      // set expiry time in the future or in the past
      const blockNumber = await provider.getBlockNumber();
      const blockTimestamp = (await provider.getBlock(blockNumber)).timestamp;
      const finalizesAt = expired
        ? blockTimestamp - challengeDuration
        : blockTimestamp + challengeDuration;

      // compute expected ChannelStorageHash
      const challengeExistsHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
          [setTurnNumRecord, finalizesAt, challengeStateHash, challenger.address, outcomeHash],
        ),
      );

      // pack arguemtns
      const ChannelStorageLite =
        'tuple(uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';
      const channelStorageLiteBytes = defaultAbiCoder.encode(
        [ChannelStorageLite],
        [[finalizesAt, challengeStateHash, challenger.address, outcomeHash]],
      );

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the states
      const sigs = new Array(participants.length);
      for (let i = 0; i < participants.length; i++) {
        const sig = await sign(wallets[i], stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }

      // call forceMove in a slightly different way if expecting a revert
      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ForceMove.respondWithAlternative(
              fixedPart,
              largestTurnNum,
              variableParts,
              isFinalCount,
              sigs,
              whoSignedWhat,
              channelStorageLiteBytes,
            ),
          regex,
        );
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);
        const tx2 = await ForceMove.respondWithAlternative(
          fixedPart,
          largestTurnNum,
          variableParts,
          isFinalCount,
          sigs,
          whoSignedWhat,
          channelStorageLiteBytes,
        );

        // wait for tx to be mined
        await tx2.wait();

        // catch ChallengeCleared event
        const [_, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(largestTurnNum));

        // compute expected ChannelStorageHash
        const expectedChannelStorage = [largestTurnNum, 0, HashZero, AddressZero, HashZero];
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
