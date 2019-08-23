import {ethers} from 'ethers';
// @ts-ignore
import OptimizedForceMoveArtifact from '../../build/contracts/TESTOptimizedForceMove.json';
import {setupContracts, sign} from './test-helpers';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let OptimizedForceMove: ethers.Contract;

const participants = ['', '', ''];
const wallets = new Array(3);

// populate wallets and participants array
for (let i = 0; i < 3; i++) {
  wallets[i] = ethers.Wallet.createRandom();
  participants[i] = wallets[i].address;
}

beforeAll(async () => {
  OptimizedForceMove = await setupContracts(provider, OptimizedForceMoveArtifact);
});

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
      await OptimizedForceMove.validSignatures(8, addresses, stateHashes, sigs, whoSignedWhat),
    ).toBe(true);
    const brokenSigs = sigs.reverse();
    expect(
      await OptimizedForceMove.validSignatures(
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
      await OptimizedForceMove.validSignatures(8, addresses, [stateHash], sigs, whoSignedWhat),
    ).toBe(true);
    const brokenSigs = sigs.reverse();
    expect(
      await OptimizedForceMove.validSignatures(
        8,
        addresses,
        [stateHash],
        brokenSigs,
        whoSignedWhat,
      ),
    ).toBe(false);
  });
});
