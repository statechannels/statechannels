import {Contract, Wallet, utils} from 'ethers';
const {id} = utils;

import ForceMoveArtifact from '../../../artifacts/contracts/test/TESTForceMove.sol/TESTForceMove.json';
import {getTestProvider, setupContract} from '../../test-helpers';
import {sign} from '../../../src/signatures';
const provider = getTestProvider();
let ForceMove: Contract;

beforeAll(async () => {
  ForceMove = setupContract(provider, ForceMoveArtifact, process.env.TEST_FORCE_MOVE_ADDRESS);
});

describe('_validSignatures (participants sign only their own states)', () => {
  it.each`
    nParticipants | largestTurnNum
    ${2}          | ${1}
    ${2}          | ${2}
    ${2}          | ${3}
    ${2}          | ${4}
    ${2}          | ${5}
    ${2}          | ${6}
    ${2}          | ${7}
    ${3}          | ${2}
    ${3}          | ${3}
    ${3}          | ${4}
    ${3}          | ${5}
  `(
    'works for, largestTurnNum = $largestTurnNum, nParticipants = $nParticipants',
    async ({nParticipants, largestTurnNum}) => {
      const nStates = nParticipants;
      const addresses = [];
      const sigs = [];
      const stateHashes = [];
      const whoSignedWhat = [];
      for (let i = 0; i < nStates; i++) {
        const turnNum = largestTurnNum - nStates + i;
        stateHashes[i] = id('state-data' + turnNum);
      }
      for (let i = 0; i < nParticipants; i++) {
        const wallet = Wallet.createRandom();
        addresses[i] = wallet.address;
        const offset = (largestTurnNum + nParticipants - i) % nParticipants; // distance to owner of largestTurnNum
        whoSignedWhat[i] = nStates - 1 - offset;
        const sig = await sign(wallet, stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }
      expect(
        await ForceMove.validSignatures(largestTurnNum, addresses, stateHashes, sigs, whoSignedWhat)
      ).toBe(true);
      const brokenSigs = sigs.reverse();
      expect(
        await ForceMove.validSignatures(
          largestTurnNum,
          addresses,
          stateHashes,
          brokenSigs,
          whoSignedWhat
        )
      ).toBe(false);
    }
  );
});

describe('_validSignatures (participants all sign a single state)', () => {
  it.each`
    nParticipants | largestTurnNum
    ${2}          | ${1}
    ${2}          | ${2}
    ${2}          | ${3}
    ${2}          | ${4}
    ${2}          | ${5}
    ${2}          | ${6}
    ${2}          | ${7}
  `(
    'works for, largestTurnNum = $largestTurnNum, nParticipants = $nParticipants',
    async ({nParticipants, largestTurnNum}) => {
      // const nStates = 1
      const addresses = [];
      const sigs = [];
      const stateHashes = [id('state-data' + largestTurnNum)];
      const whoSignedWhat = [];
      for (let i = 0; i < nParticipants; i++) {
        const wallet = Wallet.createRandom();
        addresses[i] = wallet.address;
        whoSignedWhat[i] = 0;
        const sig = await sign(wallet, stateHashes[whoSignedWhat[i]]);
        sigs[i] = {v: sig.v, r: sig.r, s: sig.s};
      }
      expect(
        await ForceMove.validSignatures(largestTurnNum, addresses, stateHashes, sigs, whoSignedWhat)
      ).toBe(true);
      const brokenSigs = sigs.reverse();
      expect(
        await ForceMove.validSignatures(
          largestTurnNum,
          addresses,
          stateHashes,
          brokenSigs,
          whoSignedWhat
        )
      ).toBe(false);
    }
  );
});
