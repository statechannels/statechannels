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
export function isSimpleEthAllocation(outcome: Outcome): outcome is SimpleEthAllocation {
  return outcome.type === 'SimpleEthAllocation';
}
export interface SimpleTokenAllocation {
  type: 'SimpleTokenAllocation';
  tokenAddress: string;
  allocationItems: AllocationItem[];
}
export function isSimpleTokenAllocation(outcome: Outcome): outcome is SimpleTokenAllocation {
  return outcome.type === 'SimpleTokenAllocation';
}
interface SimpleEthGuarantee {
  type: 'SimpleEthGuarantee';
  guarantorAddress: string;
  destinations: string[];
}
export function isSimpleEthGuarantee(outcome: Outcome): outcome is SimpleEthGuarantee {
  return outcome.type === 'SimpleEthGuarantee';
}
export interface SimpleTokenGuarantee {
  type: 'SimpleTokenGuarantee';
  tokenAddress: string;
  guarantorAddress: string;
  destinations: string[];
}
export function isSimpleTokenGuarantee(outcome: Outcome): outcome is SimpleTokenGuarantee {
  return outcome.type === 'SimpleTokenGuarantee';
}
export interface MixedAllocation {
  type: 'MixedAllocation';
  ethAllocation?: SimpleEthAllocation;
  tokenAllocations?: SimpleTokenAllocation[];
}
export function isMixedAllocation(outcome: Outcome): outcome is MixedAllocation {
  return outcome.type === 'MixedAllocation';
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
  signature: string;
}
