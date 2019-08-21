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

// set event listener
let forceMoveEvent;

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
  appDefinition = countingAppArtifact.networks[networkId].address; // use a fixed appDefinition in all tests
});

beforeEach(() => {
  forceMoveEvent = new Promise((resolve, reject) => {
    optimizedForceMove.on('ForceMove', (cId, expTime, turnNum, challengerAddress, event) => {
      event.removeListener();
      resolve([expTime, turnNum]);
    });
    setTimeout(() => {
      reject(new Error('timeout'));
    }, 60000);
  });
});

// Scenarios are synonymous with channelNonce:

const description1 =
  'It accepts a forceMove for an open channel (first challenge, n states submitted), and updates storage correctly';
const description2 =
  'It accepts a forceMove for an open channel (first challenge, 1 state submitted), and updates storage correctly';
const description3 =
  'It accepts a forceMove for an open channel (subsequent challenge, higher turnNum), and updates storage correctly';
const description4 =
  'It reverts a forceMove for an open channel if the turnNum is too small (subsequent challenge, turnNumRecord would decrease)';
const description5 = 'It reverts a forceMove when a challenge is underway / finalized';
const description6 = 'It reverts a forceMove with an incorrect challengerSig';
const description7 = 'It reverts a forceMove with the states do not form a validTransition chain';
const description8 = 'It reverts when an unacceptable whoSignedWhat array is submitted';

describe('forceMove', () => {
  it.each`
    description     | channelNonce | initialChannelStorageHash | turnNumRecord | largestTurnNum | appDatas     | isFinalCount | whoSignedWhat | challenger        | reasonString
    ${description1} | ${1}         | ${HashZero}               | ${8}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]}     | ${undefined}
    ${description2} | ${2}         | ${HashZero}               | ${0}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${undefined}
    ${description3} | ${3}         | ${clearedChallengeHash}   | ${5}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${undefined}
    ${description4} | ${4}         | ${clearedChallengeHash}   | ${5}          | ${2}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${'Stale challenge!'}
    ${description5} | ${5}         | ${ongoinghallengeHash}    | ${5}          | ${8}           | ${[2]}       | ${0}         | ${[0, 0, 0]}  | ${wallets[2]}     | ${'Channel is not open or turnNum does not match'}
    ${description6} | ${6}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 1, 2]}  | ${nonParticipant} | ${'Challenger is not a participant'}
    ${description7} | ${7}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 1]} | ${0}         | ${[0, 1, 2]}  | ${wallets[2]}     | ${'CountingApp: Counter must be incremented'}
    ${description8} | ${8}         | ${HashZero}               | ${0}          | ${8}           | ${[0, 1, 2]} | ${0}         | ${[0, 0, 2]}  | ${wallets[2]}     | ${'Unacceptable whoSignedWhat array'}
  `(
    '$description', // for the purposes of this test, chainId and participants are fixed, making channelId 1-1 with channelNonce
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

      // call forceMove in a slightly different way if expecting a revert
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
        const [expiryTime, newTurnNumRecord] = await forceMoveEvent;
        // newTurnNumRecord not used here but important for the responder to know

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
