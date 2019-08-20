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

// TODO use .each to improve readability and reduce boilerplate
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
