import {defaultAbiCoder, keccak256} from 'ethers/utils';
import {Channel, getChannelId} from './channel';
import {encodeOutcome, hashOutcome, Outcome} from './outcome';
import {Address, Bytes32, Uint256, Uint48} from './types';

export interface State {
  turnNum: number;
  isFinal: boolean;
  channel: Channel;
  challengeDuration: number;
  outcome: Outcome;
  appDefinition: string;
  appData: string;
}
export interface FixedPart {
  chainId: Uint256;
  participants: Address[];
  channelNonce: Uint256;
  appDefinition: Address;
  challengeDuration: Uint48;
}
export function getFixedPart(state: State): FixedPart {
  const {appDefinition, challengeDuration, channel} = state;
  const {chainId, participants, channelNonce} = channel;
  return {chainId, participants, channelNonce, appDefinition, challengeDuration};
}

export interface VariablePart {
  outcome: Bytes32;
  appData: Bytes32;
}

export function getVariablePart(state: State): VariablePart {
  return {outcome: encodeOutcome(state.outcome), appData: state.appData};
}

export function hashAppPart(state: State): Bytes32 {
  const {challengeDuration, appDefinition, appData} = state;
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'address', 'bytes'],
      [challengeDuration, appDefinition, appData]
    )
  );
}

export function hashState(state: State): Bytes32 {
  const {turnNum, isFinal} = state;
  const channelId = getChannelId(state.channel);
  const appPartHash = hashAppPart(state);
  const outcomeHash = hashOutcome(state.outcome);

  return keccak256(
    defaultAbiCoder.encode(
      [
        'tuple(uint256 turnNum, bool isFinal, bytes32 channelId, bytes32 appPartHash, bytes32 outcomeHash)',
      ],
      [{turnNum, isFinal, channelId, appPartHash, outcomeHash}]
    )
  );
}
