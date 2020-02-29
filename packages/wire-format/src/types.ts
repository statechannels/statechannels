/**
 * Ethereum Address
 * @pattern  ^0x([a-fA-F0-9]{40})|0$
 */
export type Address = string;

/**
 * Bytes32
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type Bytes32 = string;

/**
 * Uint256
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type Uint256 = string;

/**
 * Bytes
 * @pattern  ^0x([a-fA-F0-9]*)$
 */
export type Bytes = string;

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: Address; // Address used to sign channel updates
  destination: Address; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: Bytes32; // Address of EOA or channelId to receive funds
  amount: Uint256; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  assetHolderAddress: Address; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

export type Allocations = Allocation[]; // included for backwards compatibility

export interface Gaurantee {
  assetHolderAddress: Address;
  targetChannelId: Bytes32;
  destinations: Bytes32[];
}

export type Guarantees = Gaurantee[];

export type Outcome = Guarantees | Allocations;

export function isAllocations(outcome: Outcome): outcome is Allocations {
  if (outcome.length === 0) {
    return true;
  } else {
    const first = outcome[0];
    return 'allocationItems' in first;
  }
}

export interface SignedState {
  chainId: string;
  participants: Participant[];
  channelNonce: Uint256;
  appDefinition: Address;
  challengeDuration: Uint256;
  outcome: Outcome;
  turnNum: Uint256;
  appData: Bytes;
  isFinal: boolean;
  channelId: Bytes32;
  signatures: string[];
}

type _Objective<Name, Data> = {
  participants: Participant[];
  type: Name;
  data: Data;
};
export type OpenChannel = _Objective<
  'OpenChannel',
  {
    targetChannelId: Bytes32;
  }
>;
export type VirtuallyFund = _Objective<
  'VirtuallyFund',
  {
    targetChannelId: Bytes32;
    jointChannelId: Bytes32;
  }
>;
export type FundGuarantor = _Objective<
  'FundGuarantor',
  {
    jointChannelId: Bytes32;
    ledgerId: Bytes32;
    guarantorId: Bytes32;
  }
>;

export type Objective = OpenChannel | VirtuallyFund | FundGuarantor;

const guard = <T extends Objective>(name: Objective['type']) => (o: Objective): o is T =>
  o.type === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');

export interface Message {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: {
    signedStates?: SignedState[];
    objectives?: Objective[];
  };
}
