/**
 * Ethereum Address
 * @pattern  ^0x([a-fA-F0-9]{40})|0$
 */
export type Address = string;

/**
 * Nitro ChannelId
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type ChannelId = string;

/**
 * Nitro ChannelId
 * @pattern  ^0x(0{24})([a-fA-F0-9]{40})$
 */
export type ExternalDestination = string; // currently unused in this schema

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

export interface Participant {
  participantId: string; // App allocated id, used for relaying messages to the participant
  signingAddress: Address; // Address used to sign channel updates
  destination: Address; // Address of EOA to receive channel proceeds (the account that'll get the funds).
}

export interface AllocationItem {
  destination: Address; // Address of EOA to receive channel proceeds.
  amount: Uint256; // How much funds will be transferred to the destination address.
}

export interface Allocation {
  token: Address; // The token's contract address.
  allocationItems: AllocationItem[]; // A list of allocations (how much funds will each destination address get).
}

export type Allocations = Allocation[]; // included for backwards compatibility

export interface ChannelBudget {
  channelId: Bytes32;
  amount: Uint256;
}

export interface TokenBudget {
  token: Address;
  availableReceiveCapacity: Uint256;
  availableSendCapacity: Uint256;
  channels: ChannelBudget[];
}
export interface DomainBudget {
  domain: string;
  hubAddress: string;
  budgets: TokenBudget[];
}

export interface Funds {
  token: Address;
  amount: Uint256;
}

export type ChannelStatus =
  | 'proposed'
  | 'opening'
  | 'funding'
  | 'running'
  | 'challenging'
  | 'responding'
  | 'closing'
  | 'closed';

export interface ChannelResult {
  participants: Participant[];
  allocations: Allocation[];
  appData: string;
  appDefinition: Address;
  channelId: ChannelId;
  status: ChannelStatus;
  turnNum: Uint256;
  challengeExpirationTime?: number;
}

export interface Message {
  recipient: string; // Identifier of user that the message should be relayed to
  sender: string; // Identifier of user that the message is from
  data: unknown; // Message payload. Format defined by wallet and opaque to app.
}
