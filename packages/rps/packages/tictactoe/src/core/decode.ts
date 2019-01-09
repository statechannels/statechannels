import { State } from 'fmg-core';
import decodeState from './walletdecode';

import * as positions from './positions';
import { GamePositionType } from './encode';
import bnToHex from '../utils/bnToHex';

const PREFIX_CHARS = 2; // the 0x takes up 2 characters
const CHARS_PER_BYTE = 2;
const N_PLAYERS = 2;
const CHANNEL_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // type, nonce, nPlayers, [players]
const STATE_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // stateType, turnNum, stateCount, [balances]
const GAME_ATTRIBUTE_OFFSET = CHANNEL_BYTES + STATE_BYTES;

function extractInt(hexString: string, byteOffset: number = 0, numBytes: number = 32) {
  return parseInt(extractBytes(hexString, byteOffset, numBytes), 16);
}

function extractBytes(hexString: string, byteOffset: number = 0, numBytes: number = 32) {
  const charOffset = PREFIX_CHARS + byteOffset * CHARS_PER_BYTE;
  return '0x' + hexString.substr(charOffset, numBytes * CHARS_PER_BYTE);
}

// TicTacToe State Fields
// (relative to gamestate offset) <- GK / this is because the gamestate is appended to the full state of the channel, which has things like turnNum in it
// ==============================
// [  0 -  31] enum positionType
// [ 32 -  63] uint256 stake
// [ 64 -  95] uint256 noughts
// [ 96 -  127] uint256 crosses 

function extractGamePositionType(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET) as GamePositionType;
}

function extractStake(hexString: string) {
  return extractBytes(hexString, GAME_ATTRIBUTE_OFFSET + 32);
}


function extractNoughts(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 64);
}

function extractCrosses(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 96);
}

export default function decode(hexString: string) {
  const state = decodeState(hexString);
  const balances = state.resolution.map(bnToHex) as [string, string];
  const { channel, turnNum, stateType } = state;
  const { channelType: libraryAddress, channelNonce, participants } = channel;
  const base = { libraryAddress, channelNonce, participants, turnNum, balances };

  // conclude is a special case as it doesn't have the buyIn
  if (stateType === State.StateType.Conclude) {
    return positions.conclude(base);
  }

  const roundBuyIn = extractStake(hexString);
  const stateCount = state.stateCount;

  switch (stateType) {
    case State.StateType.Game:
      return decodeGameState(state, roundBuyIn, hexString);
    case State.StateType.PreFundSetup:
      if (stateCount === 0) {
        return positions.preFundSetupA({ ...base, stateCount, roundBuyIn });
      } else {
        return positions.preFundSetupB({ ...base, stateCount, roundBuyIn });
      }
    case State.StateType.PostFundSetup:
      if (stateCount === 0) {
        return positions.postFundSetupA({ ...base, stateCount, roundBuyIn });
      } else {
        return positions.postFundSetupB({ ...base, stateCount, roundBuyIn });
      }
    default:
      console.log(state);
      throw new Error('unreachable (failed to match stateType)');
  }
}

export function decodeGameState(state: State, roundBuyIn: string, hexString: string) {
  const position = extractGamePositionType(hexString);
  const balances = state.resolution.map(bnToHex) as [string, string];
  const { channel, turnNum } = state;
  const { channelType: libraryAddress, channelNonce, participants } = channel;
  const channelParams = { libraryAddress, channelNonce, participants };
  const base = { ...channelParams, turnNum, roundBuyIn, balances };

  switch (position) {
    case GamePositionType.Resting:
      return positions.resting(base);
    case GamePositionType.Oplaying:
      const oplayingnoughts = extractNoughts(hexString);
      const oplayingcrosses = extractCrosses(hexString);
      return positions.Oplaying({ ...base, noughts: oplayingnoughts, crosses: oplayingcrosses });
    case GamePositionType.Xplaying:
      const xplayingnoughts = extractNoughts(hexString);
      const xplayingcrosses = extractCrosses(hexString);
      return positions.Xplaying({ ...base, noughts: xplayingnoughts, crosses: xplayingcrosses });
    case GamePositionType.Victory:
      const victorynoughts = extractNoughts(hexString);
      const victorycrosses = extractCrosses(hexString);
      return positions.victory({ ...base, noughts: victorynoughts, crosses: victorycrosses });
    case GamePositionType.Draw:
      const drawnoughts = extractNoughts(hexString);
      const drawcrosses = extractCrosses(hexString);
      return positions.draw({ ...base, noughts: drawnoughts, crosses: drawcrosses });
  }
}

