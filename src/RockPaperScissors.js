import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  turnNum,
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
    toHex32(stateType).substr(2) +
    toHex32(aBal).substr(2) +
    toHex32(bBal).substr(2) +
    toHex32(stake).substr(2) +
    padBytes32(aPreCommit).substr(2, 66) +
    toHex32(bPlay).substr(2) +
    toHex32(aPlay).substr(2) +
    toHex32(aSalt).substr(2)
  );

  return packCommon(channelType, channelNonce, turnNum, participantA, participantB, gameState);
}

export function hashCommitment(play, salt) {
  let paddedPlay = toHex32(play).substr(2);
  let paddedSalt = toHex32(salt).substr(2);
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
