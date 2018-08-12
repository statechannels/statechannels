import { toHex32, padBytes32 } from 'fmg-core';
import { soliditySha3 } from 'web3-utils';

import Accept from './Accept';
import Conclude from './Conclude';
import PostFundSetup from './PostFundSetup';
import PreFundSetup from './PreFundSetup';
import Propose from './Propose';
import Resting from './Resting';
import Reveal from './Reveal';

export {
  Accept,
  Conclude,
  PostFundSetup,
  PreFundSetup,
  Propose,
  Resting,
  Reveal
} 

export enum Position {
  Resting,
  Propose,
  Accept,
  Reveal,
}

export enum Play {
  Rock,
  Paper,
  Scissors
}

export enum Result {
  Tie,
  AWon,
  BWon,
}

export function packRestingAttributes(stake: number) {
  return (
    toHex32(Position.Resting).substr(2) + 
    toHex32(stake).substr(2)
  );
}

export function packProposeAttributes(stake: number, preCommit: string) {
  return (
    toHex32(Position.Propose).substr(2) + 
    toHex32(stake).substr(2) +
    padBytes32(preCommit).substr(2)
  );
}

export function packAcceptAttributes(stake: number, preCommit: string, bPlay: Play) {
  return (
    toHex32(Position.Accept).substr(2) + 
    toHex32(stake).substr(2) +
    padBytes32(preCommit).substr(2) +
    toHex32(bPlay).substr(2)
  );
}

export function packRevealAttributes(
  stake: number, 
  bPlay: Play,
  aPlay: Play,
  salt: string,
) {
  return (
    toHex32(Position.Reveal).substr(2) + 
    toHex32(stake).substr(2) +
    padBytes32('0x0').substr(2) + // don't need the preCommit
    toHex32(bPlay).substr(2) +
    toHex32(aPlay).substr(2) +
    padBytes32(salt).substr(2)
  );
}

export function hashCommitment(play: Play, salt: string) {
  return soliditySha3(
    { type: 'uint256', value: play },
    { type: 'bytes32', value: padBytes32(salt) },
  );
}

export function calculateResult(aPlay: Play, bPlay: Play) {
  const x = ((aPlay - bPlay) + 2) % 3;
  switch(x) {
    case 0:
      return Result.AWon;
    case 1:
      return Result.BWon;
    default:
      return Result.Tie;
  }
}
 