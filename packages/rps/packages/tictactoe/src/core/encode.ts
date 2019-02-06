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
    case positions.XPLAYING:
    case positions.VICTORY:
    case positions.DRAW:
    case positions.PLAY_AGAIN_ME_FIRST:
    case positions.PLAY_AGAIN_ME_SECOND:
      return State.StateType.Game;
    case positions.CONCLUDE:
      return State.StateType.Conclude;
    default:
      return State.StateType.Game;
  }
}

function encodeGameAttributes(position: positions.Position) {
  switch (position.name) {
    case positions.XPLAYING:
      return packXPlayingAttributes(position);
    case positions.OPLAYING:
      return packOPlayingAttributes(position);
    case positions.VICTORY:
      return packVictoryAttributes(position);
    case positions.DRAW:
      return packDrawAttributes(position);
    case positions.PLAY_AGAIN_ME_FIRST:
      return packPlayAgainMeFirstAttributes(position.roundBuyIn);
    case positions.PLAY_AGAIN_ME_SECOND:
      return packPlayAgainMeSecondAttributes(position.roundBuyIn);
    case positions.CONCLUDE:
      return '';
    default:
      // pack blank game attributes inside Pre/PostFundSetup
      return packPlayAgainMeSecondAttributes(position.roundBuyIn);
  }
}

export enum GamePositionType {
  XPlaying = 0,
  OPlaying = 1,
  Victory = 2,
  Draw = 3,
  PlayAgainMeFirst = 4,
  PlayAgainMeSecond = 5,
}

export function packOPlayingAttributes(position: positions.OPlaying) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.OPlaying).substr(2) +
    padBytes32(roundBuyIn).substr(2) +
    toHex32(noughts).substr(2) +
    toHex32(crosses).substr(2)
  );
}

export function packXPlayingAttributes(position: positions.XPlaying) {
  const { roundBuyIn, noughts, crosses } = position;
  return (
    toHex32(GamePositionType.XPlaying).substr(2) +
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

export function packPlayAgainMeFirstAttributes(stake: string) {
  return (
    toHex32(GamePositionType.PlayAgainMeFirst).substr(2) +
    padBytes32(stake).substr(2)
  );
}

export function packPlayAgainMeSecondAttributes(stake: string) {
  return (
    toHex32(GamePositionType.PlayAgainMeSecond).substr(2) +
    padBytes32(stake).substr(2)
  );
}
