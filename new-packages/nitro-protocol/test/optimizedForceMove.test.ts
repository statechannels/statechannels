import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import optimizedForceMoveArtifact from '../build/contracts/TESTOptimizedForceMove.json';
// @ts-ignore
import countingAppArtifact from '../build/contracts/CountingApp.json';
import {splitSignature, keccak256, defaultAbiCoder, arrayify, hexlify} from 'ethers/utils';
import {HashZero, AddressZero, MaxUint256} from 'ethers/constants';

let networkId;
let optimizedForceMove: ethers.Contract;
const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer = provider.getSigner(0);
async function setupContracts() {
  networkId = (await provider.getNetwork()).chainId;
  const optimizedForceMoveContractAddress = optimizedForceMoveArtifact.networks[networkId].address;
  optimizedForceMove = new ethers.Contract(
    optimizedForceMoveContractAddress,
    optimizedForceMoveArtifact.abi,
    signer,
  );
}

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
  await setupContracts();
});

async function sign(wallet: ethers.Wallet, msgHash: string | Uint8Array) {
  // msgHash is a hex string
  // returns an object with v, r, and s properties.
  return splitSignature(await wallet.signMessage(arrayify(msgHash)));
}

describe('_isAddressInArray', () => {
  let suspect;
  let addresses;

  beforeAll(() => {
    suspect = ethers.Wallet.createRandom().address;
    addresses = [
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
    ];
  });

  it('verifies absence of suspect', async () => {
    expect(await optimizedForceMove.isAddressInArray(suspect, addresses)).toBe(false);
  });
  it('finds an address hiding in an array', async () => {
    addresses[1] = suspect;
    expect(await optimizedForceMove.isAddressInArray(suspect, addresses)).toBe(true);
  });
});

// TODO use .each to improve readability and reduce boilerplate
// TODO consider separating tests into separate files

describe('_acceptableWhoSignedWhat', () => {
  let whoSignedWhat;
  let nParticipants = 3;
  let nStates;
  it('verifies correct array of who signed what (n states)', async () => {
    whoSignedWhat = [0, 1, 2];
    nParticipants = 3;
    nStates = 3;
    for (let largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
      // TODO is there a more elegant way of robustly testing largestTurnNum? For example, largestTurnNum  = 2 + randomInteger * nParticipants
      expect(
        await optimizedForceMove.acceptableWhoSignedWhat(
          whoSignedWhat,
          largestTurnNum,
          nParticipants,
          nStates,
        ),
      ).toBe(true);
    }
  });
  it('verifies correct array of who signed what (fewer than n states)', async () => {
    whoSignedWhat = [0, 0, 1];
    nStates = 2;
    for (let largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
      expect(
        await optimizedForceMove.acceptableWhoSignedWhat(
          whoSignedWhat,
          largestTurnNum,
          nParticipants,
          nStates,
        ),
      ).toBe(true);
    }
  });
  it('verifies correct array of who signed what (1 state)', async () => {
    whoSignedWhat = [0, 0, 0];
    nStates = 1;
    for (let largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
      expect(
        await optimizedForceMove.acceptableWhoSignedWhat(
          whoSignedWhat,
          largestTurnNum,
          nParticipants,
          nStates,
        ),
      ).toBe(true);
    }
  });
  it('reverts when the array is not the required length', async () => {
    whoSignedWhat = [0, 0];
    nStates = 1;
    for (let largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
      await expectRevert(
        () =>
          optimizedForceMove.acceptableWhoSignedWhat(
            whoSignedWhat,
            largestTurnNum,
            nParticipants,
            nStates,
          ),
        '_validSignatures: whoSignedWhat must be the same length as participants',
      );
    }
  });
  it('returns false when a participant signs a state with an insufficiently large turnNum', async () => {
    whoSignedWhat = [0, 0, 2];
    nStates = 3;
    for (let largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
      expect(
        await optimizedForceMove.acceptableWhoSignedWhat(
          whoSignedWhat,
          largestTurnNum,
          nParticipants,
          nStates,
        ),
      ).toBe(false);
    }
  });
});

describe('_recoverSigner', () => {
  it('recovers the signer correctly', async () => {
    // following https://docs.ethers.io/ethers.js/html/cookbook-signing.html
    const privateKey = '0x0123456789012345678901234567890123456789012345678901234567890123';
    const wallet = new ethers.Wallet(privateKey);
    const msgHash = ethers.utils.id('Hello World');
    const msgHashBytes = arrayify(msgHash);
    const sig = await sign(wallet, msgHashBytes);
    expect(await optimizedForceMove.recoverSigner(msgHash, sig.v, sig.r, sig.s)).toEqual(
      wallet.address,
    );
  });
});

describe('_validSignatures', () => {
  let sig;
  let sigs;
  let whoSignedWhat;
  let stateHashes;
  let addresses;
  let stateHash;
  let wallet;
  beforeEach(() => {
    sigs = new Array(3);
    whoSignedWhat = new Array(3);
    stateHashes = new Array(3);
    addresses = new Array(3);
  });

  it('returns true (false) for a correct (incorrect) set of signatures on n states', async () => {
    for (let i = 0; i < 3; i++) {
      wallet = ethers.Wallet.createRandom();
      addresses[i] = wallet.address;
      stateHash = ethers.utils.id('Commitment' + i);
      stateHashes[i] = stateHash;
      sig = await sign(wallet, stateHash);
      sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      whoSignedWhat[i] = i;
    }
    expect(
      await optimizedForceMove.validSignatures(8, addresses, stateHashes, sigs, whoSignedWhat),
    ).toBe(true);
    const brokenSigs = sigs.reverse();
    expect(
      await optimizedForceMove.validSignatures(
        8,
        addresses,
        stateHashes,
        brokenSigs,
        whoSignedWhat,
      ),
    ).toBe(false);
  });
  it('returns true (false) for a correct (incorrect) set of signatures on 1 state', async () => {
    stateHash = ethers.utils.id('Commitment' + 8);
    for (let i = 0; i < 3; i++) {
      wallet = ethers.Wallet.createRandom();
      addresses[i] = wallet.address;
      sig = await sign(wallet, stateHash);
      sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      whoSignedWhat[i] = 0;
    }
    expect(
      await optimizedForceMove.validSignatures(8, addresses, [stateHash], sigs, whoSignedWhat),
    ).toBe(true);
    const brokenSigs = sigs.reverse();
    expect(
      await optimizedForceMove.validSignatures(
        8,
        addresses,
        [stateHash],
        brokenSigs,
        whoSignedWhat,
      ),
    ).toBe(false);
  });
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
