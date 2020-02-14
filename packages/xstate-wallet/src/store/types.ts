import {BigNumber} from 'ethers/utils';

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

export interface AllocationItem {
  destination: string;
  amount: BigNumber;
}
export interface SimpleEthAllocation {
  type: 'SimpleEthAllocation';
  allocationItems: AllocationItem[];
}
export interface SimpleTokenAllocation {
  type: 'SimpleTokenAllocation';
  tokenAddress: string;
  allocationItems: AllocationItem[];
}
export interface SimpleEthGuarantee {
  type: 'SimpleEthGuarantee';
  guarantorAddress: string;
  destinations: string[];
}
export interface SimpleTokenGuarantee {
  type: 'SimpleTokenGuarantee';
  tokenAddress: string;
  guarantorAddress: string;
  destinations: string[];
}
export interface MixedAllocation {
  type: 'MixedAllocation';
  ethAllocation?: SimpleEthAllocation;
  tokenAllocations?: SimpleTokenAllocation[];
}

// TODO: Better name?
export type SimpleOutcome =
  | SimpleEthAllocation
  | SimpleTokenAllocation
  | SimpleEthGuarantee
  | SimpleTokenGuarantee;
export type Outcome = SimpleOutcome | MixedAllocation;

export interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {}

export interface SignedState extends State {
  signatures: string[];
}
