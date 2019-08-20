import {ethers} from 'ethers';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
// @ts-ignore
import countingAppArtifact from '../../build/contracts/CountingApp.json';
import {keccak256, defaultAbiCoder} from 'ethers/utils';
import {HashZero} from 'ethers/constants';
import {setupContracts, sign} from './test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let optimizedForceMove: ethers.Contract;
let networkId;

const turnNumRecord = 0;
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

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

// TODO extend test coverage to the following scenarios:

// It accepts a forceMove for an open channel (first challenge)
// It accepts a forceMove for an open channel (subsequent challenge, higher turnNum)
// It rejects a forceMove for an open channel if the turnNum is too small (subsequent challenge, turnNumRecord would decrease)
// It rejects a forceMove when a challenge is already underway
// It rejects a forceMove for a finalized channel
// It rejects a forceMove with an incorrect challengerSig
// It rejects a forceMove with the states don't form a validTransition chain
// It rejects a forceMove when one state isn't correctly signed

describe('forceMove (expect tx to succeed and a correct channelStorageHash stored against channelId)', () => {
  it.each`
    channelNonce | initialChannelStorageHash | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger
    ${1}         | ${HashZero}               | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]}
    ${2}         | ${HashZero}               | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}
  `(
    'tx succeeds and storage updated for channel with channelNonce $channelNonce', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
    async ({
      channelNonce,
      initialChannelStorageHash,
      largestTurnNum,
      appDatas,
      isFinalCount,
      whoSignedWhat,
      challenger,
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
    },
  );
});
