import { toHex32, padBytes32 } from './utils';

export function pack(stateType, aBal, bBal, stake, aPreCommit, bPlay, aPlay, aSalt) {
  return (
    "0x" +
    toHex32(stateType) +
    toHex32(aBal) +
    toHex32(bBal) +
    toHex32(stake) +
    padBytes32(aPreCommit).substr(2, 66) +
    toHex32(bPlay) +
    toHex32(aPlay) +
    toHex32(aSalt)
  );
}

export function hashCommitment(play, salt) {
  let paddedPlay = toHex32(play);
  let paddedSalt = toHex32(salt);
  return web3.sha3(paddedPlay + paddedSalt, {encoding: 'hex'}); // concat and hash
}
