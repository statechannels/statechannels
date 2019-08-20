import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {setupContracts, sign} from './test-helpers';
import {HashZero, AddressZero} from 'ethers/constants';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let optimizedForceMove: ethers.Contract;
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
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

describe('respond (undefined reason implies tx success and storage updated correctly)', () => {
  it.each`
    channelNonce | setTurnNumRecord | declaredTurnNumRecord | expired  | isFinalAB         | appDatas  | challenger    | responder     | reasonString
    ${1}         | ${8}             | ${8}                  | ${false} | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]} | ${undefined}
    ${2}         | ${8}             | ${8}                  | ${true}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]} | ${'Response too late!'}
    ${3}         | ${8}             | ${7}                  | ${true}  | ${[false, false]} | ${[0, 1]} | ${wallets[2]} | ${wallets[0]} | ${'Challenge State does not match stored version'}
  `(
    'tx for channel with channelNonce $channelNonce -> revert reason: $reasonString', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
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
      const expiryTime = expired
        ? blockTimestamp - challengeDuration
        : blockTimestamp + challengeDuration;

      // compute expected ChannelStorageHash
      const challengeExistsHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
          [setTurnNumRecord, expiryTime, challengeStateHash, challenger.address, outcomeHash],
        ),
      );

      // call public wrapper to set state (only works on test contract)
      const tx = await optimizedForceMove.setChannelStorageHash(channelId, challengeExistsHash);
      await tx.wait();
      expect(await optimizedForceMove.channelStorageHashes(channelId)).toEqual(challengeExistsHash);

      // sign the state
      const signature = await sign(responder, responseStateHash);
      const sig = {v: signature.v, r: signature.r, s: signature.s};

      if (reasonString) {
        expectRevert(
          () =>
            optimizedForceMove.respond(
              declaredTurnNumRecord,
              expiryTime,
              challenger.address,
              isFinalAB,
              fixedPart,
              [challengeVariablePart, responseVariablePart],
              sig,
            ),
          'VM Exception while processing transaction: revert ' + reasonString,
        );
      } else {
        // call respond
        const tx2 = await optimizedForceMove.respond(
          declaredTurnNumRecord,
          expiryTime,
          challenger.address,
          isFinalAB,
          fixedPart,
          [challengeVariablePart, responseVariablePart],
          sig,
        );

        await tx2.wait();

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
        expect(await optimizedForceMove.channelStorageHashes(channelId)).toEqual(
          expectedChannelStorageHash,
        );
      }
    },
  );
});
