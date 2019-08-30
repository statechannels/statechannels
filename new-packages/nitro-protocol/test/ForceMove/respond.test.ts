import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import ForceMoveArtifact from '../../build/contracts/TESTForceMove.json';
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
const nonParticipant = ethers.Wallet.createRandom();

beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

const description1 = 'It accepts a respond tx for an ongoing challenge';
const description2 = 'It reverts a respond tx if the challenge has expired';
const description3 = 'It reverts a respond tx if the declaredTurnNumRecord is incorrect';
const description4 = 'It reverts a respond tx if it is not signed by the correct participant';
const description5 =
  'It reverts a respond tx if the response state is not a validTransition from the challenge state';

describe('respond', () => {
  it.each`
    description     | channelNonce | setTurnNumRecord | declaredTurnNumRecord | expired  | isFinalAB         | appDatas  | challenger    | responder         | reasonString
    ${description1} | ${1001}      | ${8}             | ${8}                  | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${undefined}
    ${description2} | ${1002}      | ${8}             | ${8}                  | ${true}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${'Response too late!'}
    ${description3} | ${1003}      | ${8}             | ${7}                  | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]}     | ${'Challenge State does not match stored version'}
    ${description4} | ${1004}      | ${8}             | ${8}                  | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${nonParticipant} | ${'Response not signed by authorized mover'}
    ${description5} | ${1005}      | ${8}             | ${8}                  | ${false} | ${[false, false]} | ${[0, 0]} | ${wallets[2]} | ${wallets[0]}     | ${'CountingApp: Counter must be incremented'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      setTurnNumRecord,
      declaredTurnNumRecord,
      expired,
      isFinalAB,
      appDatas,
      challenger,
      responder,
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
        isFinal: isFinalAB[0],
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

      const responseAppPartHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes'],
          [challengeDuration, appDefinition, defaultAbiCoder.encode(['uint256'], [appDatas[1]])],
        ),
      );

      const responseState = {
        turnNum: setTurnNumRecord + 1,
        isFinal: isFinalAB[1],
        channelId,
        responseAppPartHash,
        outcomeHash,
      };

      const responseStateHash = keccak256(
        defaultAbiCoder.encode(
          [
            'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 responseAppPartHash, bytes32 outcomeHash)',
          ],
          [responseState],
        ),
      );

      const challengeVariablePart = {
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[0]]), // a counter
      };
      const responseVariablePart = {
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [appDatas[1]]), // a counter
      };

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

      // call public wrapper to set state (only works on test contract)
      const tx = await ForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await ForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the state
      const signature = await sign(responder, responseStateHash);
      const sig = {v: signature.v, r: signature.r, s: signature.s};

      if (reasonString) {
        const regex = new RegExp(
          '^' + 'VM Exception while processing transaction: revert ' + reasonString + '$',
        );
        await expectRevert(
          () =>
            ForceMove.respond(
              declaredTurnNumRecord,
              finalizesAt,
              challenger.address,
              isFinalAB,
              fixedPart,
              [challengeVariablePart, responseVariablePart],
              sig,
            ),
          regex,
        );
      } else {
        const challengeClearedEvent: any = newChallengeClearedEvent(ForceMove, channelId);
        // call respond
        const tx2 = await ForceMove.respond(
          declaredTurnNumRecord,
          finalizesAt,
          challenger.address,
          isFinalAB,
          fixedPart,
          [challengeVariablePart, responseVariablePart],
          sig,
        );

        // wait for tx to be mined
        await tx2.wait();

        // catch ChallengeCleared event
        const [_, eventTurnNumRecord] = await challengeClearedEvent;
        expect(eventTurnNumRecord._hex).toEqual(hexlify(declaredTurnNumRecord + 1));

        // compute and check new expected ChannelStorageHash
        const expectedChannelStorage = [
          declaredTurnNumRecord + 1,
          0,
          HashZero,
          AddressZero,
          HashZero,
        ];
        const expectedChannelStorageHash = keccak256(
          defaultAbiCoder.encode(
            ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
            expectedChannelStorage,
          ),
        );
        expect(await ForceMove.channelStorageHashes(channelId)).toEqual(expectedChannelStorageHash);
      }
    },
  );
});
