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

export type Uint48 = number;
export type Uint8 = number;

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

export interface Allocation {
  destination: Bytes32; // Address of EOA or channelId to receive funds
  amount: Uint256; // How much funds will be transferred to the destination address.
  metadata: Bytes;
  allocationType: Uint8;
}

export interface SingleAssetOutcome {
  asset: Address; // The asset holder address.
  allocations: Allocation[]; // A list of allocations (how much funds will each destination address get).
  metadata: Bytes;
}

export type Outcome = SingleAssetOutcome[];

export interface SignedState {
  chainId: string;
  participants: Participant[];
  channelNonce: Uint48;
  appDefinition: Address;
  challengeDuration: Uint48;
  outcome: Outcome;
  turnNum: Uint48;
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
type FundingStrategy = 'Direct' | 'Ledger' | 'Virtual' | 'Fake' | 'Unknown';
export type OpenChannel = _Objective<
  'OpenChannel',
  {
    targetChannelId: Bytes32;
    fundingStrategy: FundingStrategy;
    role?: 'app' | 'ledger'; // Default should be app
    fundingLedgerChannelId?: Address;
  }
>;
export type CloseChannel = _Objective<
  'CloseChannel',
  {
    targetChannelId: Bytes32;
    fundingStrategy: FundingStrategy;
    txSubmitterOrder: number[];
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

export type FundLedger = _Objective<
  'FundLedger',
  {
    ledgerId: Bytes32;
  }
>;

export type CloseLedger = _Objective<
  'CloseLedger',
  {
    ledgerId: Bytes32;
  }
>;

export type Objective =
  | OpenChannel
  | CloseChannel
  | VirtuallyFund
  | FundGuarantor
  | FundLedger
  | CloseLedger;

const guard = <T extends Objective>(name: Objective['type']) => (o: Objective): o is T =>
  o.type === name;
export const isOpenChannel = guard<OpenChannel>('OpenChannel');
export const isVirtuallyFund = guard<VirtuallyFund>('VirtuallyFund');
export const isFundGuarantor = guard<FundGuarantor>('FundGuarantor');

// channel requests
type GetChannel = {type: 'GetChannel'; channelId: string};
export type ChannelRequest = GetChannel;

export interface Payload {
  walletVersion: string; // e.g. @statechannels/server-wallet@1.4.0
  signedStates?: SignedState[];
  objectives?: Objective[];
  requests?: ChannelRequest[];
}

export interface Message {
  recipient: string; // Identifier of user that the message should be relayed to
  sender?: string; // Identifier of user that the message is from
  data: Payload;
}
