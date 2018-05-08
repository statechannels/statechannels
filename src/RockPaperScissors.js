import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  stateNonce,
  stateType,
  aBal,
  bBal,
  stake,
  aPreCommit,
  bPlay,
  aPlay,
  aSalt
) {
  let gameState =  (
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

  return packCommon(channelType, channelNonce, stateNonce, participantA, participantB, gameState);
}

export function hashCommitment(play, salt) {
  let paddedPlay = toHex32(play);
  let paddedSalt = toHex32(salt);
  return web3.sha3(paddedPlay + paddedSalt, {encoding: 'hex'}); // concat and hash
}

// enum names aren't supported in ABI, so have to use integers for time being
export const START = 0;
export const ROUNDPROPOSED = 1;
export const ROUNDACCEPTED = 2;
export const REVEAL = 3;
export const CONCLUDED = 4;

export const ROCK = 0;
export const PAPER = 1;
export const SCISSORS = 2;
