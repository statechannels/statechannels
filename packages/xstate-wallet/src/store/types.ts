import {BigNumber} from 'ethers/utils';
import {Outcome} from '@statechannels/nitro-protocol';

export const a = 1;

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
// signers

export interface StateVariables {
  outcome: Outcome;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}

// lookup outcome based on token address

interface SimpleEthAllocation {
  type: 'SimpleEthAllocation';
  allocationItems: [string, BigNumber][];
}

interface SimpleTokenAllocation {
  type: 'SimpleTokenAllocation';
  tokenAddress: string;
  allocationItems: [string, BigNumber][];
}

interface SimpleEthGuarantee {
  type: 'SimpleEthGuarantee';
  guarantorAddress: string;
  destinations: string[];
}
interface SimpleTokenGuarantee {
  type: 'SimpleTokenGuarantee';
  tokenAddress: string;
  guarantorAddress: string;
  destinations: string[];
}

interface MixedAllocation {
  type: 'MixedAllocation';
  ethAllocation?: SimpleEthAllocation;
  tokenAllocations?: SimpleTokenAllocation[];
}
export type Outcome2 =
  | SimpleEthAllocation
  | SimpleTokenAllocation
  | SimpleEthGuarantee
  | SimpleTokenGuarantee
  | MixedAllocation;

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {
  channelId: string;
}

export interface SignedState extends State {
  signature: string;
}
