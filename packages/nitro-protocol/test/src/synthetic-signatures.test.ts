import {arrayify} from '@ethersproject/bytes';
import {BigNumber, ethers, Signature} from 'ethers';
import {randomChannelId} from '../test-helpers';

// ansazt 0
function createSyntheticSignatureType0(channelId: string) {
  // this naive approach won't always work, since r and s must be elements of the field Z/pZ
  // i.e. no greater than p
  // tha change of exceeding p is extremely small, however
  // https://docs.ethers.io/v5/api/utils/bytes/#Signature
  return {r: channelId, s: channelId, v: 27};
}

// ansazt 1
function createSyntheticSignatureType1(channelId: string) {
  const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  return {
    r: ethers.BigNumber.from(channelId).mod(p).toHexString(),
    s: ethers.BigNumber.from(channelId).mod(p).toHexString(),
    v: 27,
  };
}

// ansazt 2
function createSyntheticSignatureType2(channelId: string) {
  const p = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
  return {
    r: ethers.BigNumber.from(channelId).mod(p).toHexString(),
    // The Homestead hardfork invalidates signatures with r larger than a certain value
    // eips.ethereum.org/EIPS/eip-2
    // One way to construct a valid one is to just set s to 0
    s: '0x0',
    v: 27, // this is only going to be right about 50% of the time
  };
}

function computeDigest(invokerAddress: string) {
  return ethers.utils.keccak256(
    '0x' +
      '03' +
      '000000000000000000000000' +
      invokerAddress.slice(2) +
      '00000000000000000000000000000000'
  );
}

function computeSyntheticAddress(signature) {
  return ethers.utils.recoverPublicKey(digest, signature);
}

function validSignature(signature) {
  try {
    computeSyntheticAddress(signature);
    return true;
  } catch (error) {
    return false;
  }
}

const invokerAddress = '0x6b175474e89094c44da98b954eedeac495271d0f';
const digest = computeDigest(invokerAddress); // a valid ethereum address

describe('synthetic signatures', () => {
  [createSyntheticSignatureType0, createSyntheticSignatureType1, createSyntheticSignatureType2].map(
    fn => {
      it(`generates a signature that will recover to a valid public key / address, using ${fn.name}`, () => {
        const channelId = randomChannelId();
        const signature = fn(channelId);
        expect(validSignature(signature)).toBe(true);
      });
    }
  );
});
