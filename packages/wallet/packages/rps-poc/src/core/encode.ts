import BN from 'bn.js';
import { Channel, State, toHex32, padBytes32 } from 'fmg-core';
import { soliditySha3 } from 'web3-utils';
import * as positions from './positions';
import { toPaddedHexString } from 'fmg-core/lib/src/utils';
import { Move } from './moves';

function packBN(num:BN){
  return toPaddedHexString(num, 64);
}

export default function encode(position: positions.Position) {
  const { libraryAddress, channelNonce, participants, turnNum, balances } = position;
  const channel = new Channel(libraryAddress, channelNonce, participants);

  const stateCount = ('stateCount' in position) ? position.stateCount : 0;

  const state = new State({
    channel,
    stateType: stateType(position),
    turnNum,
    stateCount,
    resolution: balances,
  });

  return state.toHex() + encodeGameAttributes(position);
}

function stateType(position: positions.Position) {
  switch (position.name) {
    case positions.PRE_FUND_SETUP_A:
    case positions.PRE_FUND_SETUP_B:
      return State.StateType.PreFundSetup;
    case positions.POST_FUND_SETUP_A:
    case positions.POST_FUND_SETUP_B:
      return State.StateType.PostFundSetup;
    case positions.CONCLUDE:
      return State.StateType.Conclude;
    default:
      return State.StateType.Game;
  }
}

function encodeGameAttributes(position: positions.Position) {
  switch (position.name) {
    case positions.PROPOSE:
      return packProposeAttributes(position);
    case positions.ACCEPT:
      return packAcceptAttributes(position);
    case positions.REVEAL:
      return packRevealAttributes(position);
    case positions.CONCLUDE:
      return '';
    default:
      // unreachable
      return packRestingAttributes(position.roundBuyIn);
  }
}

export enum GamePositionType {
  Resting = 0,
  Propose = 1,
  Accept = 2,
  Reveal = 3,
}

export function packRestingAttributes(stake: BN) {
  return toHex32(GamePositionType.Resting).substr(2) + packBN(stake);
}

export function packProposeAttributes(position: positions.Propose) {
  const { roundBuyIn, preCommit } = position;
  return (
    toHex32(GamePositionType.Propose).substr(2) +
    packBN(roundBuyIn) +
    padBytes32(preCommit).substr(2)
  );
}

export function packAcceptAttributes(position: positions.Accept) {
  const { roundBuyIn, preCommit, bsMove } = position;
  return (
    toHex32(GamePositionType.Accept).substr(2) +
    packBN(roundBuyIn) +
    padBytes32(preCommit).substr(2) +
    toHex32(bsMove).substr(2)
  );
}

export function packRevealAttributes(position: positions.Reveal) {
  const { roundBuyIn, bsMove, asMove, salt } = position;

  return (
    toHex32(GamePositionType.Reveal).substr(2) +
    packBN(roundBuyIn)+
    padBytes32('0x0').substr(2) + // don't need the preCommit
    toHex32(bsMove).substr(2) +
    toHex32(asMove).substr(2) +
    padBytes32(salt).substr(2)
  );
}

export function hashCommitment(move: Move, salt: string) {
  return soliditySha3(
    { type: 'uint256', value: move },
    { type: 'bytes32', value: padBytes32(salt) },
  );
}

