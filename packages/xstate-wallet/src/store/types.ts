import {BigNumber} from 'ethers/utils';

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

interface AllocationItem {
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

interface SimpleEthGuarantee {
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
export type AuxillaryChannelOutcome =
  | SimpleEthAllocation
  | SimpleTokenAllocation
  | SimpleEthGuarantee
  | SimpleTokenGuarantee;
export type Outcome = AuxillaryChannelOutcome | MixedAllocation;

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
