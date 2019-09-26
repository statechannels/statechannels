import {ethers} from 'ethers';
// @ts-ignore
import ForceMoveArtifact from '../../../build/contracts/TESTForceMove.json';
import {setupContracts, getTestProvider} from '../../test-helpers';

const provider = getTestProvider();
let ForceMove: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  ForceMove = await setupContracts(provider, ForceMoveArtifact);
});

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
    expect(await ForceMove.isAddressInArray(suspect, addresses)).toBe(false);
  });
  it('finds an address hiding in an array', async () => {
    addresses[1] = suspect;
    expect(await ForceMove.isAddressInArray(suspect, addresses)).toBe(true);
  });
});
