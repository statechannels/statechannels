import { Channel, State } from 'fmg-core';

import { Play, GamePositionType } from '.';
import PreFundSetup from './PreFundSetup';
import PostFundSetup from './PostFundSetup';
import Propose from './Propose';
import Accept from './Accept';
import Reveal from './Reveal';
import Resting from './Resting';
import Conclude from './Conclude';

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

function extractChannel(hexString: string) {
  const channelType = extractBytes(hexString, 12, 20);
  const channelNonce = extractInt(hexString, 32);
  const nPlayers = extractInt(hexString, 64);
  if (nPlayers !== N_PLAYERS) {
    throw new Error(
      `Rock-paper-scissors requires exactly ${N_PLAYERS} players. ${nPlayers} provided.`,
    );
  }

  const participantA = extractBytes(hexString, 3 * 32 + 12, 20);
  const participantB = extractBytes(hexString, 4 * 32 + 12, 20);

  return new Channel(channelType, channelNonce, [participantA, participantB]);
}

function extractStateType(hexString: string) {
  return extractInt(hexString, CHANNEL_BYTES);
}

function extractTurnNum(hexString: string) {
  return extractInt(hexString, CHANNEL_BYTES + 32);
}

function extractStateCount(hexString: string) {
  return extractInt(hexString, CHANNEL_BYTES + 64);
}

function extractBalances(hexString: string) {
  const aBal = extractInt(hexString, CHANNEL_BYTES + 3 * 32);
  const bBal = extractInt(hexString, CHANNEL_BYTES + 4 * 32);
  return [aBal, bBal];
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
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 32);
}

function extractPreCommit(hexString: string) {
  return extractBytes(hexString, GAME_ATTRIBUTE_OFFSET + 64);
}

function extractBPlay(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 3 * 32) as Play;
}

function extractAPlay(hexString: string) {
  return extractInt(hexString, GAME_ATTRIBUTE_OFFSET + 4 * 32) as Play;
}

function extractSalt(hexString: string) {
  return extractBytes(hexString, GAME_ATTRIBUTE_OFFSET + 5 * 32);
}

function decodeGameState(channel, turnNum: number, balances: number[], hexString: string) {
  const position = extractGamePositionType(hexString);
  const stake = extractStake(hexString);

  switch (position) {
    case GamePositionType.Resting:
      return new Resting(channel, turnNum, balances, stake);
    case GamePositionType.Propose:
      const preCommitPro = extractPreCommit(hexString);
      return new Propose(channel, turnNum, balances, stake, preCommitPro);
    case GamePositionType.Accept:
      const preCommitAcc = extractPreCommit(hexString);
      const bPlayAcc = extractBPlay(hexString);
      return new Accept(channel, turnNum, balances, stake, preCommitAcc, bPlayAcc);
    case GamePositionType.Reveal:
      const bPlayRev = extractBPlay(hexString);
      const aPlay = extractAPlay(hexString);
      const salt = extractSalt(hexString);
      return new Reveal(channel, turnNum, balances, stake, bPlayRev, aPlay, salt);
  }
}

export default function decode(hexString) {
  const channel = extractChannel(hexString);
  const turnNum = extractTurnNum(hexString);
  const stateType = extractStateType(hexString);
  const balances = extractBalances(hexString);

  switch (stateType) {
    case State.StateType.Conclude:
      return new Conclude(channel, turnNum, balances);
    case State.StateType.PreFundSetup:
      const stateCountPre = extractStateCount(hexString);
      const stakePre = extractStake(hexString);
      return new PreFundSetup(channel, turnNum, balances, stateCountPre, stakePre);
    case State.StateType.PostFundSetup:
      const stateCountPost = extractStateCount(hexString);
      const stakePost = extractStake(hexString);
      return new PostFundSetup(channel, turnNum, balances, stateCountPost, stakePost);
    case State.StateType.Game:
      return decodeGameState(channel, turnNum, balances, hexString);
    default:
      throw new Error('unreachable');
  }
}
