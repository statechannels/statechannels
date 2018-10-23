import { State } from 'fmg-core';
import BN from 'bn.js';
import decodeState from '../wallet/domain/decode';

import * as positions from './positions';
import { Move } from './moves';
import { GamePositionType } from './encode';

const PREFIX_CHARS = 2; // the 0x takes up 2 characters
const CHARS_PER_BYTE = 2;
const N_PLAYERS = 2;
const CHANNEL_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // type, nonce, nPlayers, [players]
const STATE_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // stateType, turnNum, stateCount, [balances]
const GAME_ATTRIBUTE_OFFSET = CHANNEL_BYTES + STATE_BYTES;

function extractBN(hexString: string, byteOffset: number = 0, numBytes: number = 32) {
  return new BN(extractBytes(hexString, byteOffset, numBytes).substr(2), 16);
}
function extractInt(hexString: string, byteOffset: number = 0, numBytes: number = 32) {
  return parseInt(extractBytes(hexString, byteOffset, numBytes), 16);
}

function extractBytes(hexString: string, byteOffset: number = 0, numBytes: number = 32) {
  const charOffset = PREFIX_CHARS + byteOffset * CHARS_PER_BYTE;
  return '0x' + hexString.substr(charOffset, numBytes * CHARS_PER_BYTE);
}

// RockPaperScissors State Fields
// (relative to gamestate offset)
// ==============================
// [  0 -  31] enum positionType
// [ 32 -  63] uint256 stake
// [ 64 -  95] bytes32 preCommit
// [ 96 - 127] enum bPlay
// [128 - 159] enum aPlay
// [160 - 191] bytes32 salt
// [192 - 223] uint256 roundNum

function extractGamePositionType(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET) as GamePositionType;
}

function extractStake(hexString: string) {
  return extractBN(hexString, GAME_ATTRIBUTE_OFFSET + 32);
}

function extractPreCommit(hexString: string) {
  return extractBytes(hexString, GAME_ATTRIBUTE_OFFSET + 64);
}

function extractBPlay(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 3 * 32) as Move;
}

function extractAPlay(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 4 * 32) as Move;
}

function extractSalt(hexString: string) {
  return extractBytes(hexString, GAME_ATTRIBUTE_OFFSET + 5 * 32);
}

export default function decode(hexString: string) {
  const state = decodeState(hexString);
  const { channel, turnNum, stateType, resolution: balances } = state;
  const { channelType: libraryAddress, channelNonce, participants } = channel;
  const base = { libraryAddress, channelNonce, participants, turnNum, balances: balances as [BN, BN] };

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
      throw new Error('unreachable');
  }
}

export function decodeGameState(state: State, roundBuyIn: BN, hexString: string) {
  const position = extractGamePositionType(hexString);
  const { channel, turnNum, resolution: balances } = state;
  const { channelType: libraryAddress, channelNonce, participants } = channel;
  const channelParams = { libraryAddress, channelNonce, participants };
  const base = { ...channelParams, turnNum, roundBuyIn, balances: balances as [BN, BN] };

  switch (position) {
    case GamePositionType.Resting:
      return positions.resting(base);
    case GamePositionType.Propose:
      const preCommit0 = extractPreCommit(hexString);
      return positions.propose({...base, preCommit: preCommit0 });
    case GamePositionType.Accept:
      const preCommit1 = extractPreCommit(hexString);
      const bsMove1 = extractBPlay(hexString);
      return positions.accept({...base, preCommit: preCommit1, bsMove: bsMove1 });
    case GamePositionType.Reveal:
      const bsMove2 = extractBPlay(hexString);
      const asMove2 = extractAPlay(hexString);
      const salt = extractSalt(hexString);
      return positions.reveal({...base, asMove: asMove2, bsMove: bsMove2, salt });
  }
}

