import {BigNumber} from 'ethers/utils';
import {Funding} from './store';
import {FundingStrategy} from '@statechannels/client-api-schema/src';
import {SignatureEntry} from './channel-store-entry';

export interface SiteBudget {
  domain: string;
  hubAddress: string;
  forAsset: Record<string, AssetBudget | undefined>;
}

interface ChannelBudgetEntry {
  amount: BigNumber;
}
export interface AssetBudget {
  assetHolderAddress: string;
  availableReceiveCapacity: BigNumber;
  availableSendCapacity: BigNumber;
  channels: Record<string, ChannelBudgetEntry>;
}
export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: Destination;
}
// signers

export interface StateVariables {
  outcome: Outcome;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}
export type StateVariablesWithHash = StateVariables & Hashed;
export type Destination = string & {_isDestination: void};
export interface AllocationItem {
  destination: Destination;
  amount: BigNumber;
}
export interface SimpleAllocation {
  type: 'SimpleAllocation';
  assetHolderAddress: string;
  allocationItems: AllocationItem[];
}
export interface SimpleGuarantee {
  type: 'SimpleGuarantee';
  targetChannelId: string;
  assetHolderAddress: string;
  destinations: string[];
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
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {}

interface Signed {
  signatures: SignatureEntry[];
}
interface Hashed {
  stateHash: string;
}
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
  {
    targetChannelId: string;
    fundingStrategy: FundingStrategy;
  }
>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {
    targetChannelId: string;
    jointChannelId: string;
  }
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {
    jointChannelId: string;
    ledgerId: string;
    guarantorId: string;
  }
>;
export type FundLedger = _Objective<
  'FundLedger',
  {
    ledgerId: string;
  }
>;
export type CloseLedger = _Objective<
  'CloseLedger',
  {
    ledgerId: string;
  }
>;
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
  channelConstants: Omit<ChannelConstants, 'challengeDuration' | 'channelNonce'> & {
    challengeDuration: BigNumber | string; // TODO: This probably shouldn't be a BigNumber
    channelNonce: BigNumber | string;
  };
  funding: Funding | undefined;
  applicationSite: string | undefined;
  myIndex: number;
};
export interface DBBackend {
  initialize(cleanSlate?: boolean): Promise<any>;
  privateKeys(): Promise<Record<string, string | undefined>>;
  ledgers(): Promise<Record<string, string | undefined>>;
  nonces(): Promise<Record<string, BigNumber | undefined>>;
  objectives(): Promise<Objective[]>;
  channels(): Promise<Record<string, ChannelStoredData | undefined>>;

  setPrivateKey(key: string, value: string): Promise<string>;
  getPrivateKey(key: string): Promise<string | undefined>;
  setChannel(key: string, value: ChannelStoredData): Promise<ChannelStoredData>;
  addChannel(key: string, value: ChannelStoredData): Promise<ChannelStoredData>;
  getChannel(key: string): Promise<ChannelStoredData | undefined>;
  getBudget(key: string): Promise<SiteBudget | undefined>;
  setBudget(key: string, budget: SiteBudget): Promise<SiteBudget>;
  deleteBudget(key: string): Promise<void>;
  setLedger(key: string, value: string): Promise<string>;
  getLedger(key: string): Promise<string | undefined>;
  setNonce(key: string, value: BigNumber): Promise<BigNumber>;
  getNonce(key: string): Promise<BigNumber | undefined>;
  setObjective(key: number, value: Objective): Promise<Objective>;
  getObjective(key: number): Promise<Objective | undefined>;
  setReplaceObjectives(values: Objective[]): Promise<Objective[]>;
}
