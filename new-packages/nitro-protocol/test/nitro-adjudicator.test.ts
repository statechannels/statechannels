import {ethers} from 'ethers';
// @ts-ignore
import optimizedForceMoveArtifact from '../build/contracts/TESTOptimizedForceMove.json';

let optimizedForceMove: ethers.Contract;

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);

async function setupContracts() {
  let networkId;
  networkId = (await provider.getNetwork()).chainId;
  const contractAddress = optimizedForceMoveArtifact.networks[networkId].address;
  optimizedForceMove = new ethers.Contract(
    contractAddress,
    optimizedForceMoveArtifact.abi,
    provider,
  );
}

beforeAll(async () => {
  await setupContracts();
});

describe('_isAddressInArray', () => {
  const suspect = ethers.Wallet.createRandom().address;
  let addresses;
  addresses = [
    ethers.Wallet.createRandom().address,
    ethers.Wallet.createRandom().address,
    ethers.Wallet.createRandom().address,
  ];

  it('verifies absence of suspect', async () => {
    expect(await optimizedForceMove.isAddressInArray(suspect, addresses)).toBe(false);
  });
  it('finds an address hiding in an array', async () => {
    addresses[1] = suspect;
    expect(await optimizedForceMove.isAddressInArray(suspect, addresses)).toBe(true);
  });
});

describe('_acceptableWhoSignedWhat', () => {
  let whoSignedWhat;
  let largestTurnNum;
  let nParticipants;
  let nStates;
  it('verifies correct array of who signed what (n states)', async () => {
    whoSignedWhat = [0, 1, 2];
    nParticipants = 3;
    nStates = 3;
    for (largestTurnNum = 2; largestTurnNum < 14; largestTurnNum += nParticipants) {
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
  // it('verifies correct array of who signed what (fewer than n states)',
  // });
  // it('verifies correct array of who signed what (1 state)', async () => {
  // });
  // it('reverts when the array is not the required length', async () => {
  // });
});
