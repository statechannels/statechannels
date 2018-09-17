import { Channel, State, } from 'fmg-core';
import BN from 'bn.js';

  // TODO: The decode function should really be part of FMG-Core
  // Eventually it would be pulled out there

const PREFIX_CHARS = 2; // the 0x takes up 2 characters
const CHARS_PER_BYTE = 2;
const N_PLAYERS = 2;
const CHANNEL_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // type, nonce, nPlayers, [players]
const STATE_BYTES = 32 + 32 + 32 + 32 * N_PLAYERS; // stateType, turnNum, stateCount, [balances]
export const GAME_ATTRIBUTE_OFFSET = CHANNEL_BYTES + STATE_BYTES;

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

function extractChannel(hexString: string) {
  const channelType = extractBytes(hexString, 12, 20);
  const channelNonce = extractInt(hexString, 32);
  const nPlayers = extractInt(hexString, 64);
  if (nPlayers !== N_PLAYERS) {
    throw new Error(
      `${N_PLAYERS} players required. ${nPlayers} provided.`,
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
  const aBal = extractBN(hexString, CHANNEL_BYTES + 3 * 32);
  const bBal = extractBN(hexString, CHANNEL_BYTES + 4 * 32);
  return [aBal, bBal];
}



export default function decode(hexString) {
  const channel = extractChannel(hexString);
  const turnNum = extractTurnNum(hexString);
  const stateType = extractStateType(hexString);
  const balances = extractBalances(hexString);
  const stateCount = extractStateCount(hexString);
  return new State({ channel, turnNum, resolution: balances, stateCount, stateType });

}
