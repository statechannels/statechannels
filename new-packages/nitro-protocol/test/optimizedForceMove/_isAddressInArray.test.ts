import {ethers} from 'ethers';
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
