import {utils} from 'ethers';

import {Channel, getChannelId} from './channel';
import {encodeOutcome, hashOutcome, Outcome} from './outcome';
import {Address, Bytes32, Uint256, Uint48} from './types';

/**
 * Holds all of the data defining the state of a channel
 */
export interface State {
  turnNum: number; // TODO: This should maybe be a string b/c it is uint256 in solidity
  isFinal: boolean;
  channel: Channel;
  challengeDuration: number;
  outcome: Outcome;
  appDefinition: string;
  appData: string;
}

/**
 * The part of a State which does not ordinarily change during state channel updates
 */
export interface FixedPart {
  chainId: Uint256;
  participants: Address[];
  channelNonce: Uint48;
  appDefinition: Address;
  challengeDuration: Uint48;
}
/**
 * Extracts the FixedPart of a state
 * @param state a State
 * @returns the FixedPart, which does not ordinarily change during state channel updates
 */
export function getFixedPart(state: State): FixedPart {
  const {appDefinition, challengeDuration, channel} = state;
  const {chainId, participants, channelNonce} = channel;
  return {chainId, participants, channelNonce, appDefinition, challengeDuration};
}

/**
 * The part of a State which usually changes during state channel updates
 */
export interface VariablePart {
  outcome: Bytes32;
  appData: Bytes32;
}

/**
 * Extracts the VariablePart of a state
 * @param state a State
 * @returns the VariablePart, which usually changes during state channel updates
 */
export function getVariablePart(state: State): VariablePart {
  return {outcome: encodeOutcome(state.outcome), appData: state.appData};
}

/**
 * Encodes and hashes the AppPart of a state
 * @param state a State
 * @returns a 32 byte keccak256 hash
 */
export function hashAppPart(state: State): Bytes32 {
  const {challengeDuration, appDefinition, appData} = state;
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['uint256', 'address', 'bytes'],
      [challengeDuration, appDefinition, appData]
    )
  );
}
/**
 * Encodes and hashes a state
 * @param state a State
 * @returns a 32 byte keccak256 hash
 */
export function hashState(state: State): Bytes32 {
  const {turnNum, isFinal} = state;
  const channelId = getChannelId(state.channel);
  const appPartHash = hashAppPart(state);
  const outcomeHash = hashOutcome(state.outcome);

  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      [
        'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 appPartHash, bytes32 outcomeHash)',
      ],
      [{turnNum, isFinal, channelId, appPartHash, outcomeHash}]
    )
  );
}
