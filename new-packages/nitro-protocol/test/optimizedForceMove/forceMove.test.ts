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

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  optimizedForceMove = await setupContracts(provider, optimizedForceMoveArtifact);
  networkId = (await provider.getNetwork()).chainId;
});

// TODO use .each to improve readability and reduce boilerplate

// TODO extend test coverage to the following scenarios:

// It accepts a forceMove for an open channel (first challenge)
// It accepts a forceMove for an open channel (subsequent challenge, higher turnNum)
// It rejects a forceMove for an open channel if the turnNum is too small (subsequent challenge, turnNumRecord would decrease)
// It rejects a forceMove when a challenge is already underway
// It rejects a forceMove for a finalized channel
// It rejects a forceMove with an incorrect challengerSig
// It rejects a forceMove with the states don't form a validTransition chain
// It rejects a forceMove when one state isn't correctly signed

describe('forceMove (n states)', () => {
  it('accepts a valid forceMove tx and updates channelStorageHashes correctly', async () => {
    const sigsN = new Array(3);
    const stateHashes = new Array(3);
    // channelId
    const channelNonce = 1;
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
      appDefinition: countingAppArtifact.networks[networkId].address,
      challengeDuration: 1,
    };

    // compute stateHashes for a chain of 3 non-final states with turnNum = [6,7,8]
    const largestTurnNum = 8;
    const isFinalCount = 0;
    const whoSignedWhat = [0, 1, 2];
    const variableParts = new Array(3);
    const outcome = ethers.utils.id('some outcome data'); // CountingApp demands constant outcome
    const outcomeHash = keccak256(defaultAbiCoder.encode(['bytes'], [outcome]));
    for (let i = 0; i < 3; i++) {
      variableParts[i] = {
        outcome,
        appData: defaultAbiCoder.encode(['uint256'], [i]), // incrementing counter
      };

      const appPartHash = keccak256(
        defaultAbiCoder.encode(
          ['uint256', 'address', 'bytes'],
          [fixedPart.challengeDuration, fixedPart.appDefinition, variableParts[i].appData],
        ),
      );
      const state = {
        turnNum: i + 6,
        isFinal: false,
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
    for (let i = 0; i < 3; i++) {
      const sig = await sign(wallets[i], stateHashes[i]);
      sigsN[i] = {v: sig.v, r: sig.r, s: sig.s};
    }

    // compute challengerSig
    const msgHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'bytes32', 'string'],
        [largestTurnNum, channelId, 'forceMove'],
      ),
    );
    const challenger = wallets[2];
    const {v, r, s} = await sign(challenger, msgHash);
    const challengerSig = {v, r, s};

    // inspect current channelStorageHashes value
    const currentHash = await optimizedForceMove.channelStorageHashes(channelId);
    expect(currentHash).toEqual(HashZero);

    // call forceMove
    const tx = await optimizedForceMove.forceMove(
      turnNumRecord,
      fixedPart,
      largestTurnNum,
      variableParts,
      isFinalCount,
      sigsN,
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
    const newTurnNumRecord = (await forceMoveEvent)[1];

    // compute expected ChannelStorageHash
    const expectedChannelStorage = [
      largestTurnNum,
      expiryTime,
      stateHashes[2],
      participants[2],
      outcomeHash,
    ];
    const expectedChannelStorageHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
        expectedChannelStorage,
      ),
    );

    // call out to public mapping and check channelStorageHash against the expected value
    expect(await optimizedForceMove.channelStorageHashes(channelId)).toEqual(
      expectedChannelStorageHash,
    );
  });
});

describe('forceMove (1 state)', () => {
  it('accepts a valid forceMove tx and updates channelStorageHashes correctly ', async () => {
    const sigs = [];
    let stateHashes = [];
    // channelId
    const channelNonce = 2;
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
      appDefinition: countingAppArtifact.networks[networkId].address,
      challengeDuration: 1,
    };

    // compute stateHashes for a single non-final state with turnNum = 8
    const largestTurnNum = 8;
    const isFinalCount = 0;
    const whoSignedWhat = [0, 0, 0];
    const outcome = ethers.utils.id('some outcome data');
    const outcomeHash = keccak256(defaultAbiCoder.encode(['bytes'], [outcome]));
    const variableParts = [
      {
        outcome,
        appData: ethers.utils.id('some app data'),
      },
    ];

    const appPartHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'address', 'bytes'],
        [fixedPart.challengeDuration, fixedPart.appDefinition, variableParts[0].appData],
      ),
    );
    const state = {
      turnNum: largestTurnNum,
      isFinal: false,
      channelId,
      appPartHash,
      outcomeHash,
    };
    stateHashes = [
      keccak256(
        defaultAbiCoder.encode(
          [
            'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 appPartHash, bytes32 outcomeHash)',
          ],
          [state],
        ),
      ),
    ];

    // sign the states
    for (let i = 0; i < 3; i++) {
      const sig = await sign(wallets[i], stateHashes[0]); // everyone signs the same state
      sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
    }

    // compute challengerSig
    const msgHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'bytes32', 'string'],
        [largestTurnNum, channelId, 'forceMove'],
      ),
    );
    const {v, r, s} = await sign(wallets[2], msgHash);
    const challengerSig = {v, r, s};

    // inspect current channelStorageHashes value
    const currentHash = await optimizedForceMove.channelStorageHashes(channelId);
    expect(currentHash).toEqual(HashZero);

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
    const newTurnNumRecord = (await forceMoveEvent)[1];

    // compute expected ChannelStorageHash
    const expectedChannelStorage = [
      largestTurnNum,
      expiryTime,
      stateHashes[0],
      participants[2],
      outcomeHash,
    ];
    const expectedChannelStorageHash = keccak256(
      defaultAbiCoder.encode(
        ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
        expectedChannelStorage,
      ),
    );

    // call out to public mapping and check channelStorageHash against the expected value
    expect(await optimizedForceMove.channelStorageHashes(channelId)).toEqual(
      expectedChannelStorageHash,
    );
  });
});
