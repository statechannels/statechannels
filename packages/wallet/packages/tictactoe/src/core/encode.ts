import { Channel, State, toHex32, padBytes32 } from 'fmg-core';
import * as positions from './positions';
import hexToBN from '../utils/hexToBN';

export default function encode(position: positions.Position) {
  const { libraryAddress, channelNonce, participants, turnNum, balances } = position;
  const channel = new Channel(libraryAddress, channelNonce, participants);
  const stateCount = ('stateCount' in position) ? position.stateCount : 0;
  const state = new State({
    channel,
    stateType: stateType(position),
    turnNum,
    stateCount,
    resolution: balances.map(hexToBN),
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
    case positions.OPLAYING:
      return State.StateType.Game;
    case positions.XPLAYING:
      return State.StateType.Game;
    case positions.VICTORY:
      return State.StateType.Game;
    case positions.DRAW:
      return State.StateType.Game;
    case positions.CONCLUDE:
      return State.StateType.Conclude;
    default:
      return State.StateType.Game;
  }
}

function encodeGameAttributes(position: positions.Position) {
  switch (position.name) {
    case positions.OPLAYING:
      return packOplayingAttributes(position);
    case positions.XPLAYING:
      return packXplayingAttributes(position);
    case positions.VICTORY:
      return packVictoryAttributes(position);
    case positions.DRAW:
      return packDrawAttributes(position);
    case positions.CONCLUDE:
      return '';
    default:
      // unreachable
      return packRestingAttributes(position.roundBuyIn);
  }
}
// TODO should resting have a roundbuyin?

export enum GamePositionType {
  Resting = 0,
  Xplaying = 1,
  Oplaying = 2,
  Victory = 3,
  Draw = 4,
}

export function packRestingAttributes(stake: string) {
  return toHex32(GamePositionType.Resting).substr(2) + stake.substr(2);
}

export function packOplayingAttributes(position: positions.Oplaying) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.Oplaying).substr(2) +
    padBytes32(roundBuyIn).substr(2) +
    toHex32(noughts).substr(2) +
    toHex32(crosses).substr(2)
  );
}

export function packXplayingAttributes(position: positions.Xplaying) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.Xplaying).substr(2) +
    padBytes32(roundBuyIn).substr(2) +
    toHex32(noughts).substr(2) +
    toHex32(crosses).substr(2)
  );
}

export function packVictoryAttributes(position: positions.Victory) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.Victory).substr(2) +
    padBytes32(roundBuyIn).substr(2) +
    toHex32(noughts).substr(2) +
    toHex32(crosses).substr(2)
  );
}

export function packDrawAttributes(position: positions.Draw) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.Draw).substr(2) +
    padBytes32(roundBuyIn).substr(2) +
    toHex32(noughts).substr(2) +
    toHex32(crosses).substr(2)
  );
}
