import { toHex32, padBytes32 } from './utils';
import { pack as packCommon } from './CommonState';

class Position {
  constructor(positionType, aBal, bBal, stake, preCommit, bPlay, aPlay, aSalt) {
    this.positionType = positionType;
    this.aBal = aBal;
    this.bBal = bBal;
    this.stake = stake;
    this.preCommit = preCommit;
    this.aPlay = aPlay;
    this.bPlay = bPlay;
    this.aSalt = aSalt;
  }

  toHex() {
    return (
      toHex32(this.positionType) +
      toHex32(this.aBal).substr(2) +
      toHex32(this.bBal).substr(2) +
      toHex32(this.stake).substr(2) +
      padBytes32(this.preCommit).substr(2) +
      toHex32(this.bPlay).substr(2) +
      toHex32(this.aPlay).substr(2) +
      toHex32(this.aSalt).substr(2)
    )
  }
}

Position.PositionTypes = {
  RESTING: 0,
  ROUNDPROPOSED: 1,
  ROUNDACCEPTED: 2,
  REVEAL: 3,
}

export function pack(
  channelType,
  channelNonce,
  participantA,
  participantB,
  turnNum,
  positionType,
  aBal,
  bBal,
  stake,
  preCommit,
  bPlay,
  aPlay,
  aSalt
) {
  let pos = new Position(positionType, aBal, bBal, stake, preCommit, bPlay, aPlay, aSalt);
  let gameState = pos.toHex();
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
