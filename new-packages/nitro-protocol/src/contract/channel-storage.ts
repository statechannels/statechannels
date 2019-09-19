import {Uint48, Bytes32, Address, Bytes} from './types';
import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Outcome, hashOutcome} from './outcome';
import {State, hashState} from './state';
import {HashZero, AddressZero} from 'ethers/constants';
import {ethers} from 'ethers';

export interface ChannelStorage {
  largestTurnNum: Uint48;
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
  const {largestTurnNum, finalizesAt} = channelStorage;
  const hash = keccak256(encodeChannelStorage(channelStorage));
  const fingerprint = hash.slice(26);
  const storage =
    ethers.utils.hexZeroPad(ethers.utils.hexlify(largestTurnNum), 6) +
    ethers.utils.hexZeroPad(ethers.utils.hexlify(finalizesAt), 6).slice(2) +
    +fingerprint.slice(2);

  return storage;
}

export function encodeChannelStorage({
  finalizesAt,
  state,
  challengerAddress,
  largestTurnNum,
  outcome,
}: ChannelStorage): Bytes {
  /*
  When the channel is not open, it is still possible for the state and
  challengerAddress to be missing. They should either both be present, or
  both be missing, the latter indicating that the channel is finalized.
  It is currently up to the caller to ensure this.
  */
  const isOpen = finalizesAt == 0;

  if (isOpen && (outcome || state || challengerAddress)) {
    throw new Error(
      `Invalid open channel storage: ${JSON.stringify(outcome || state || challengerAddress)}`,
    );
  }

  const stateHash = isOpen || !state ? HashZero : hashState(state);
  const outcomeHash = isOpen ? HashZero : hashOutcome(outcome);
  challengerAddress = challengerAddress || AddressZero;

  return defaultAbiCoder.encode(
    [CHANNEL_STORAGE_TYPE],
    [[largestTurnNum, finalizesAt, stateHash, challengerAddress, outcomeHash]],
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
