import {FundingStrategy} from '@statechannels/client-api-schema/src';

export type Address = string;
export type Bytes = string;
export type Signature = string;
export type Bytes32 = string;
export type Uint48 = number;
export type Uint256 = string;
export type Destination = string;

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

export type State<T extends StateVariables = StateVariables> = T & ChannelConstants;

type Signed = {signatures: SignatureEntry[]};
type Hashed = {stateHash: Bytes32};

export type SignedStateVariables = StateVariables & Signed;
export type SignedState = State<SignedStateVariables>;

export type SignedStateVarsWithHash = SignedStateVariables & Hashed;
export type SignedStateWithHash = State<SignedStateVarsWithHash>;

export interface Message {
  signedStates?: SignedState[];
  objectives?: Objective[];
}

export type StoredState = {
  stateVariables: Array<SignedStateVarsWithHash>;
  channelConstants: ChannelConstants;
  myIndex: number;
};

export enum Errors {
  duplicateTurnNums = 'multiple states with same turn number',
  notSorted = 'states not sorted',
  multipleSignedStates = 'Store signed multiple states for a single turn',
  staleState = 'Attempting to sign a stale state',
  channelMissing = 'No channel found with id.',
  channelFunded = 'Channel already funded.',
  channelLocked = 'Channel is locked',
  noBudget = 'No budget exists for domain. ',
  noAssetBudget = "This domain's budget does contain this asset",
  channelNotInBudget = "This domain's budget does not reference this channel",
  noDomainForChannel = 'No domain defined for channel',
  domainExistsOnChannel = 'Channel already has a domain.',
  budgetAlreadyExists = 'There already exists a budget for this domain',
  budgetInsufficient = 'Budget insufficient to reserve funds',
  amountUnauthorized = 'Amount unauthorized in current budget',
  cannotFindDestination = 'Cannot find destination for participant',
  cannotFindPrivateKey = 'Private key missing for your address',
  notInChannel = 'Attempting to initialize  channel as a non-participant',
  noLedger = 'No ledger exists with peer',
  amountNotFound = 'Cannot find allocation entry with destination',
  invalidNonce = 'Invalid nonce',
  invalidTransition = 'Invalid transition',
  invalidAppData = 'Invalid app data',
  emittingDuringTransaction = 'Attempting to emit event during transaction',
  notMyTurn = "Cannot update channel unless it's your turn"
}
