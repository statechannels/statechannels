import {ethers} from 'ethers';
import {expectRevert} from 'magmo-devtools';
// @ts-ignore
import optimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
import {splitSignature, arrayify} from 'ethers/utils';

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

// TODO use .each to improve readability and reduce boilerplate
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
