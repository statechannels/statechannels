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

export type Uint48 = number;

/**
 * Uint256
 * @pattern  ^0x([a-fA-F0-9]{64})$
 */
export type Uint256 = string;

/**
 * Container for data specific to a single state channel participant
 */
export interface Participant {
  /**
   * App allocated id, used for relaying messages to the participant
   */
  participantId: string;
  /**
   * Address used to sign channel updates
   */
  signingAddress: Address;
  /**
   * Address of EOA to receive channel proceeds (the account that'll get the funds).
   */
  destination: Address;
}

/**
 * Assigns some amount of an unspecified asset to a destination
 */
export interface AllocationItem {
  /**
   * Address of EOA to receive channel proceeds.
   */
  destination: Address;
  /**
   * How much funds will be transferred to the destination address.
   */
  amount: Uint256;
}

/**
 * Array of destination-amount pairings for a given token
 */
export interface Allocation {
  /**
   * The token contract address
   */
  token: Address;
  /**
   * Array of destination-amount pairings
   */
  allocationItems: AllocationItem[];
}

/**
 * Included for backwards compatibility
 */
export type Allocations = Allocation[];

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
  turnNum: Uint48;
  challengeExpirationTime?: number;
}
/**
 * Format of message sent from the wallet to the app
 *
 * @remarks The app relays it to another participant.
 */
export interface Message {
  /**
   * Identifier of user that the message should be relayed to
   */
  recipient: string;
  /**
   * Identifier of user that the message is from
   */
  sender: string;
  /**
   * Message payload. Format defined by wallet and opaque to app.
   */
  data: unknown;
}
