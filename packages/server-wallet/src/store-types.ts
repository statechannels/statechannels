import {FundingStrategy} from '@statechannels/client-api-schema/src';

type Brand<T, K extends string> = T & {[key in K]: void};
// TODO: These should each have validators
type Address = Brand<string, '_isAddress'>;
type Bytes = Brand<string, '_isBytes'>;
type Signature = Brand<string, '_isSignature'>;
type Bytes32 = Brand<string, '_isBytes32'>;
type Uint48 = Brand<number, '_isUint48'>;
type Uint256 = Brand<string, '_isUint256'>;
type Destination = Brand<string, '_isDestination'>;

export type SignatureEntry = {signature: Signature; signer: Address};

export interface Participant {
  participantId: string;
  signingAddress: Address;
  destination: Destination;
}
// signers

export interface StateVariables {
  outcome: Outcome;
  turnNum: Uint48;
  appData: Bytes;
  isFinal: boolean;
}
export type StateVariablesWithHash = StateVariables & Hashed;
export interface AllocationItem {
  destination: Destination;
  amount: Uint256;
}
export interface SimpleAllocation {
  type: 'SimpleAllocation';
  assetHolderAddress: Address;
  allocationItems: AllocationItem[];
}
export interface SimpleGuarantee {
  type: 'SimpleGuarantee';
  targetChannelId: Bytes32;
  assetHolderAddress: Address;
  destinations: Destination[];
}
export interface MixedAllocation {
  type: 'MixedAllocation';
  simpleAllocations: SimpleAllocation[];
}

// Should we even have these two different types??
export type Allocation = SimpleAllocation | MixedAllocation;
export type Outcome = Allocation | SimpleGuarantee;

export function isAllocation(outcome: Outcome): outcome is Allocation {
  return outcome.type !== 'SimpleGuarantee';
}

export interface ChannelConstants {
  chainId: Bytes32;
  participants: Participant[];
  channelNonce: Uint48;
  appDefinition: Address;
  challengeDuration: Uint48;
}

export type State = {
  consts: ChannelConstants;
  vars: StateVariables;
};

type Signed = {signatures: SignatureEntry[]};
type Hashed = {stateHash: Bytes32};

export type SignedState = State & Signed;
export type SignedStateWithHash = SignedState & Hashed;

export type SignedStateVariables = StateVariables & Signed;
export type SignedStateVarsWithHash = SignedStateVariables & Hashed;

type _Objective<Name, Data> = {
  participants: Participant[];
  type: Name;
  data: Data;
};

export type OpenChannel = _Objective<
  'OpenChannel',
  {targetChannelId: Bytes32; fundingStrategy: FundingStrategy}
>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {targetChannelId: Bytes32; jointChannelId: Bytes32}
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {jointChannelId: Bytes32; ledgerId: Bytes32; guarantorId: Bytes32}
>;
export type FundLedger = _Objective<'FundLedger', {ledgerId: Bytes32}>;
export type CloseLedger = _Objective<'CloseLedger', {ledgerId: Bytes32}>;
export type Objective = OpenChannel | VirtuallyFund | FundGuarantor | FundLedger | CloseLedger;

const guard = <T extends Objective>(name: Objective['type']) => (o: Objective): o is T =>
  o.type === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');
export const isFundLedger = guard<FundLedger>('FundLedger');
export const isCloseLedger = guard<CloseLedger>('CloseLedger');

export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}

export type ChannelStoredData = {
  stateVariables: Array<SignedStateWithHash>;
  channelConstants: ChannelConstants;
  myIndex: number;
};
