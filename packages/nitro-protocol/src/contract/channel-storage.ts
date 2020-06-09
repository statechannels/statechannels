import {constants} from 'ethers';
import {utils} from 'ethers';
import {hashOutcome, Outcome} from './outcome';
import {hashState, State} from './state';
import {Address, Bytes, Bytes32, Uint48} from './types';
import {bigNumberify} from 'ethers/utils';

export interface ChannelData {
  turnNumRecord: Uint48;
  finalizesAt: Uint48;
  state?: State;
  challengerAddress?: Address;
  outcome?: Outcome;
}
const CHANNEL_DATA_TYPE = `tuple(
  uint256 turnNumRecord,
  uint256 finalizesAt,
  bytes32 stateHash,
  address challengerAddress,
  bytes32 outcomeHash
)`;

export interface ChannelDataLite {
  finalizesAt: Uint48;
  state: State;
  challengerAddress: Address;
  outcome: Outcome;
}
const CHANNEL_DATA_LITE_TYPE = `tuple(
  uint256 finalizesAt,
  bytes32 stateHash,
  address challengerAddress,
  bytes32 outcomeHash
)`;

export function channelDataToChannelStorageHash(channelData: ChannelData): Bytes32 {
  const {turnNumRecord, finalizesAt} = channelData;
  const hash = utils.keccak256(encodeChannelData(channelData));
  const fingerprint = utils.hexDataSlice(hash, 12);

  const storage =
    '0x' +
    utils.hexZeroPad(utils.hexlify(turnNumRecord), 6).slice(2) +
    utils.hexZeroPad(utils.hexlify(finalizesAt), 6).slice(2) +
    fingerprint.slice(2);

  return storage;
}

export function parseChannelStorageHash(
  channelStorageHash: Bytes32
): {turnNumRecord: number; finalizesAt: number; fingerprint: Bytes} {
  validateHexString(channelStorageHash);

  //
  let cursor = 2;
  const turnNumRecord = '0x' + channelStorageHash.slice(cursor, (cursor += 12));
  const finalizesAt = '0x' + channelStorageHash.slice(cursor, (cursor += 12));
  const fingerprint = '0x' + channelStorageHash.slice(cursor);

  return {
    turnNumRecord: asNumber(turnNumRecord),
    finalizesAt: asNumber(finalizesAt),
    fingerprint,
  };
}
const asNumber: (s: string) => number = s => bigNumberify(s).toNumber();

export function channelDataStruct({
  finalizesAt,
  state,
  challengerAddress,
  turnNumRecord,
  outcome,
}: ChannelData) {
  /*
  When the channel is not open, it is still possible for the state and
  challengerAddress to be missing. They should either both be present, or
  both be missing, the latter indicating that the channel is finalized.
  It is currently up to the caller to ensure this.
  */
  const isOpen = finalizesAt === 0;

  if (isOpen && (outcome || state || challengerAddress)) {
    console.warn(
      `Invalid open channel storage: ${JSON.stringify(outcome || state || challengerAddress)}`
    );
  }

  const stateHash = isOpen || !state ? constants.HashZero : hashState(state);
  const outcomeHash = isOpen || !outcome ? constants.HashZero : hashOutcome(outcome);
  challengerAddress = challengerAddress || constants.AddressZero;

  return {turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeHash};
}

export function encodeChannelData(data: ChannelData): Bytes {
  return utils.defaultAbiCoder.encode([CHANNEL_DATA_TYPE], [channelDataStruct(data)]);
}

export function channelDataLiteStruct({
  finalizesAt,
  challengerAddress,
  state,
  outcome,
}: ChannelDataLite) {
  return {
    finalizesAt,
    challengerAddress,
    stateHash: state ? hashState(state) : constants.HashZero,
    outcomeHash: outcome ? hashOutcome(outcome) : constants.HashZero,
  };
}

export function encodeChannelStorageLite(channelDataLite: ChannelDataLite): Bytes {
  return utils.defaultAbiCoder.encode(
    [CHANNEL_DATA_LITE_TYPE],
    [channelDataLiteStruct(channelDataLite)]
  );
}

function validateHexString(hexString) {
  if (!utils.isHexString(hexString)) {
    throw new Error(`Not a hex string: ${hexString}`);
  }
  if (hexString.length !== 66) {
    throw new Error(`Incorrect length: ${hexString.length}`);
  }
}
