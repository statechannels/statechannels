import {Uint256, Bytes32, Address} from './types';
import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Outcome, hashOutcome} from './outcome';
import {State, hashState} from './state';
import {HashZero} from 'ethers/constants';

export interface ChannelStorage {
  largestTurnNum: Uint256;
  finalizesAt: Uint256;
  state?: State;
  challengerAddress: Address;
  outcome?: Outcome;
}
const CHANNEL_STORAGE_TYPE =
  'tuple(uint256 turnNumRecord, uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';

export interface ChannelStorageLite {
  finalizesAt: Uint256;
  state: State;
  challengerAddress: Address;
  outcome: Outcome;
}
const CHANNEL_STORAGE_LITE_TYPE =
  'tuple(uint256 finalizesAt, bytes32 stateHash, address challengerAddress, bytes32 outcomeHash)';

export function hashChannelStorage(channelStorage: ChannelStorage): Bytes32 {
  const outcomeHash = channelStorage.outcome ? hashOutcome(channelStorage.outcome) : HashZero;
  const stateHash = channelStorage.state ? hashState(channelStorage.state) : HashZero;
  const {largestTurnNum, finalizesAt, challengerAddress} = channelStorage;

  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'uint256', 'bytes32', 'address', 'bytes32'],
      [largestTurnNum, finalizesAt, stateHash, challengerAddress, outcomeHash],
    ),
  );
}

export function encodeChannelStorageLite(channelStorageLite: ChannelStorageLite): Bytes32 {
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
