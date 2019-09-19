import {Uint48, Bytes32, Address, Bytes} from './types';
import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Outcome, hashOutcome} from './outcome';
import {State, hashState} from './state';
import {HashZero, AddressZero} from 'ethers/constants';
import {ethers} from 'ethers';

export interface ChannelStorage {
  turnNumRecord: Uint48;
  finalizesAt: Uint48;
  state?: State;
  challengerAddress?: Address;
  outcome?: Outcome;
}
const CHANNEL_STORAGE_TYPE =
  'tuple(uint256 turnNumRecord, uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';

export interface ChannelStorageLite {
  finalizesAt: Uint48;
  state: State;
  challengerAddress: Address;
  outcome: Outcome;
}
const CHANNEL_STORAGE_LITE_TYPE =
  'tuple(uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';

export function hashChannelStorage(channelStorage: ChannelStorage): Bytes32 {
  const {turnNumRecord, finalizesAt} = channelStorage;
  const hash = keccak256(encodeChannelStorage(channelStorage));
  const fingerprint = ethers.utils.hexDataSlice(hash, 12);

  const storage =
    '0x' +
    ethers.utils.hexZeroPad(ethers.utils.hexlify(finalizesAt), 6).slice(2) +
    ethers.utils.hexZeroPad(ethers.utils.hexlify(turnNumRecord), 6).slice(2) +
    fingerprint.slice(2);

  return storage;
}

export function parseChannelStorageHash(
  channelStorageHashed: Bytes32,
): {turnNumRecord: number; finalizesAt: number; fingerprint: Bytes} {
  validateHexString(channelStorageHashed);

  //
  let cursor = 2;
  const finalizesAt = '0x' + channelStorageHashed.slice(cursor, (cursor += 12));
  const turnNumRecord = '0x' + channelStorageHashed.slice(cursor, (cursor += 12));
  const fingerprint = '0x' + channelStorageHashed.slice(cursor);

  return {
    turnNumRecord: asNumber(turnNumRecord),
    finalizesAt: asNumber(finalizesAt),
    fingerprint,
  };
}
const asNumber: (s: string) => number = s => ethers.utils.bigNumberify(s).toNumber();

export function encodeChannelStorage({
  finalizesAt,
  state,
  challengerAddress,
  turnNumRecord,
  outcome,
}: ChannelStorage): Bytes {
  /*
  When the channel is not open, it is still possible for the state and
  challengerAddress to be missing. They should either both be present, or
  both be missing, the latter indicating that the channel is finalized.
  It is currently up to the caller to ensure this.
  */
  const isOpen = finalizesAt === 0;

  if (isOpen && (outcome || state || challengerAddress)) {
    throw new Error(
      `Invalid open channel storage: ${JSON.stringify(outcome || state || challengerAddress)}`,
    );
  }

  const stateHash = isOpen || !state ? HashZero : hashState(state);
  const outcomeHash = isOpen || !outcome ? HashZero : hashOutcome(outcome);
  challengerAddress = challengerAddress || AddressZero;

  return defaultAbiCoder.encode(
    [CHANNEL_STORAGE_TYPE],
    [[turnNumRecord, finalizesAt, stateHash, challengerAddress, outcomeHash]],
  );
}

export function encodeChannelStorageLite(channelStorageLite: ChannelStorageLite): Bytes {
  const outcomeHash = channelStorageLite.outcome
    ? hashOutcome(channelStorageLite.outcome)
    : HashZero;
  const stateHash = channelStorageLite.state ? hashState(channelStorageLite.state) : HashZero;
  const {finalizesAt, challengerAddress} = channelStorageLite;

  return defaultAbiCoder.encode(
    [CHANNEL_STORAGE_LITE_TYPE],
    [[finalizesAt, stateHash, challengerAddress, outcomeHash]],
  );
}

function validateHexString(hexString) {
  if (!ethers.utils.isHexString(hexString)) {
    throw new Error(`Not a hex string: ${hexString}`);
  }
  if (hexString.length !== 66) {
    throw new Error(`Incorrect length: ${hexString.length}`);
  }
}
