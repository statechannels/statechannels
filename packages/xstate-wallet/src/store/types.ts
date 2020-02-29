//This is used to identify strings that are the hex values of BN
export interface HexNumberString extends String {
  type: 'HexNumberString';
}
export function isHexNumberString(t: string | HexNumberString): t is HexNumberString {
  return t.startsWith('0x') || t.startsWith('-0x');
}

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
// signers

export interface StateVariables {
  outcome: Outcome;
  turnNum: HexNumberString;
  appData: string;
  isFinal: boolean;
}

export interface AllocationItem {
  destination: string;
  amount: HexNumberString;
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
  channelNonce: HexNumberString;
  appDefinition: string;
  challengeDuration: HexNumberString;
}

export interface State extends ChannelConstants, StateVariables {}

export interface SignedState extends State {
  signatures: string[];
}
