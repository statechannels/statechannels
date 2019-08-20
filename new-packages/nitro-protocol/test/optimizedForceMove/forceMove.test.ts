import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {HashZero, AddressZero} from 'ethers/constants';
import {setupContracts, sign} from './test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let optimizedForceMove: ethers.Contract;
let networkId;

const chainId = 1234;
const participants = ['', '', ''];
const wallets = new Array(3);
const challengeDuration = 1;
const outcome = ethers.utils.id('some outcome data'); // use a fixed outcome for all state updates in all tests
const outcomeHash = keccak256(defaultAbiCoder.encode(['bytes'], [outcome]));
let appDefinition;

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

const nonParticipant = ethers.Wallet.createRandom();
const clearedChallengeHash = keccak256(
  defaultAbiCoder.encode(
    ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
    [5, 0, HashZero, AddressZero, HashZero], // turnNum = 5
  ),
);

const ongoinghallengeHash = keccak256(
  defaultAbiCoder.encode(
    ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
    [5, 9999, HashZero, AddressZero, HashZero], // turnNum = 5, not yet finalized
  ),
);

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// Scenarios are synonymous with channelNonce:

// 1. It accepts a forceMove for an open channel (first challenge, n states submitted)
// 2. It accepts a forceMove for an open channel (first challenge, 1 state submitted)
// 3. It accepts a forceMove for an open channel (subsequent challenge, higher turnNum)
// 4. It rejects a forceMove for an open channel if the turnNum is too small (subsequent challenge, turnNumRecord would decrease)
// 5. It rejects a forceMove when a challenge is already underway (or equivalently, when the channel has been finalized -- the only check is whether a challenge has been instigated without having been cleared)
// 6. It rejects a forceMove with an incorrect challengerSig
// 7. It rejects a forceMove with the states don't form a validTransition chain
// 8. It reverts when an unacceptable whoSignedWhat array is submitted

describe('forceMove (undefined reason implies tx success and storage updated correctly)', () => {
  it.each`
    channelNonce | initialChannelStorageHash | turnNumRecord | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger        | reasonString
    ${1}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]}     | ${undefined}
    ${2}         | ${HashZero}               | ${0}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${undefined}
    ${3}         | ${clearedChallengeHash}   | ${5}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${undefined}
    ${4}         | ${clearedChallengeHash}   | ${5}          | ${2}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${'Stale challenge!'}
    ${5}         | ${ongoinghallengeHash}    | ${5}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${'Channel is not open or turnNum does not match'}
    ${6}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${nonParticipant} | ${'Challenger is not a participant'}
    ${7}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 1]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]}     | ${'CountingApp: Counter must be incremented'}
    ${8}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 0, 2]}  | ${wallets[2]}     | ${'Unacceptable whoSignedWhat array'}
  `(
    'tx for channel with channelNonce $channelNonce -> revert reason: $reasonString', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      initialChannelStorageHash,
      turnNumRecord,
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

      // sign the states
      const sigs = new Array(participants.length);
      for (let i = 0; i < participants.length; i++) {
        const sig = await sign(wallets[i], stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }

      // compute challengerSig
      const msgHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'bytes32', 'string'],
          [largestTurnNum, channelId, 'forceMove'],
        ),
      );
      const {v, r, s} = await sign(challenger, msgHash);
      const challengerSig = {v, r, s};

      // set current channelStorageHashes value
      await (await optimizedForceMove.setChannelStorageHash(
        channelId,
        initialChannelStorageHash,
      )).wait();

      if (reasonString) {
        expectRevert(
          () =>
            optimizedForceMove.forceMove(
              turnNumRecord,
              fixedPart,
              largestTurnNum,
              variableParts,
              isFinalCount,
              sigs,
              whoSignedWhat,
              challengerSig,
            ),
          'VM Exception while processing transaction: revert ' + reasonString,
        );
      } else {
        // call forceMove
        const tx = await optimizedForceMove.forceMove(
          turnNumRecord,
          fixedPart,
          largestTurnNum,
          variableParts,
          isFinalCount,
          sigs,
          whoSignedWhat,
          challengerSig,
        );

        // wait for tx to be mined
        await tx.wait();

        // catch ForceMove event and peel-off the expiryTime
        const forceMoveEvent = new Promise((resolve, reject) => {
          optimizedForceMove.on('ForceMove', (cId, expTime, turnNum, challengerAddress, event) => {
            event.removeListener();
            resolve([expTime, turnNum]);
          });
          setTimeout(() => {
            reject(new Error('timeout'));
          }, 60000);
        });
        const expiryTime = (await forceMoveEvent)[0];
        const newTurnNumRecord = (await forceMoveEvent)[1]; // not used here but important for the responder to know

        // compute expected ChannelStorageHash
        const expectedChannelStorage = [
          largestTurnNum,
          expiryTime,
          stateHashes[stateHashes.length - 1],
          challenger.address,
          outcomeHash,
        ];
        const expectedChannelStorageHash = keccak256(
          defaultAbiCoder.encode(
            ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
            expectedChannelStorage,
          ),
        );

        // check channelStorageHash against the expected value
        expect(await optimizedForceMove.channelStorageHashes(channelId)).toEqual(
          expectedChannelStorageHash,
        );
      }
    },
  );
});
