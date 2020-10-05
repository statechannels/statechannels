import {Address, Bytes32} from '@statechannels/client-api-schema';
import {providers} from 'ethers';
import {Evt} from 'evt';

// FIXME: replace with
// import {Wallet as ChannelWallet} from '@statechannels/server-wallet';
import {Wallet as ChannelWallet} from '../..';

// TODO: maybe remove?
export type AssetHolderInformation = {
  tokenAddress: Address;
  assetHolderAddress: Address;
};

// This is used instead of the ethers `Transaction` because that type
// requires the nonce and chain ID to be specified, when sometimes those
// arguments are not known at the time of creating a transaction.
export type MinimalTransaction = Pick<
  providers.TransactionRequest,
  'chainId' | 'to' | 'data' | 'value'
>;

// This is used instead of the ethers `Transaction` because that type
// requires the nonce and chain ID to be specified, when sometimes those
// arguments are not known at the time of creating a transaction.
export type NoncedMinimalTransaction = Pick<
  providers.TransactionRequest,
  'chainId' | 'to' | 'data' | 'value'
> & {nonce: number};

// FIXME: should import from the `nitro-protocol` package, but it is using
// a different version of ethers so the bignumber types are all messed up
export type ContractEventName = 'Deposited';

export type ChainEventNames = 'Funding'; //| 'Adjudication';
export interface FundingEvent {
  transactionHash: string;
  type: ContractEventName;
  blockNumber: number;
  final: boolean;
  channelId: Bytes32;
  amount: string;
  destinationHoldings: string;
}

// Configuration for sending transactions, all values have defaults
export type TransactionSubmissionOptions = Partial<{
  maxSendAttempts: number;
}>;

// Used by the chain service to gather all channel events
export interface ChannelEventRecordMap {
  Funding: FundingEvent;
}

// TODO: make union type of all events
export type ChannelEventRecord = FundingEvent;

export type EvtContainer = {
  [K in keyof ChannelEventRecordMap]: Evt<ChannelEventRecordMap[K]>;
};

// Defines the interface for the service that is responsible for handling
// all onchain interactions (i.e. events and transactions)
export interface OnchainServiceInterface {
  registerChannel(channelId: Bytes32, assetHolders: Address[]): Promise<void>;

  // TODO: remove in v1
  attachChannelWallet(wallet: ChannelWallet): void;

  attachHandler<T extends ChainEventNames>(
    assetHolderAddr: Address,
    event: T,
    callback: (event: ChannelEventRecordMap[T]) => void | Promise<void>,
    filter?: (event: ChannelEventRecordMap[T]) => boolean,
    timeout?: number
  ): Evt<ChannelEventRecordMap[T]> | Promise<ChannelEventRecordMap[T]>;

  detachAllHandlers(assetHolderAddr: Address, event?: ChainEventNames): void;
}

export const TransactionStatuses = {
  pending: 'pending',
  submitted: 'submitted',
  success: 'success',
  failed: 'failed',
} as const;
export type TransactionStatus = keyof typeof TransactionStatuses;
export interface TransactionStatusEventMap {
  [TransactionStatuses.pending]: NoncedMinimalTransaction;
  [TransactionStatuses.submitted]: providers.TransactionResponse;
  [TransactionStatuses.success]: providers.TransactionReceipt;
  [TransactionStatuses.failed]: NoncedMinimalTransaction & {reason: string};
}

// An injectable service responsible for sending transactions to chain.
// Designed to be used so the OnchainServiceInterface can "set it and forget it"
export interface TransactionSubmissionServiceInterface {
  submitTransaction(
    channelId: Bytes32, // Used for storage purposes
    minTx: MinimalTransaction,
    options?: TransactionSubmissionOptions
  ): Promise<providers.TransactionResponse>;
}

// An injectable service responsible for storing and retrieving
// TODO: this interface may change for v1
export interface OnchainServiceStoreInterface {
  // Returns all emitted events from channel or undefined if channel
  // is not registered
  getEvents(channelId: Bytes32): Promise<ChannelEventRecord[]>;

  // Returns the latest emitted event from a channel
  // FIXME: should be async, evt pipe isnt async supported :(
  getLatestEvent<T extends ChainEventNames>(
    channelId: Bytes32,
    event: T
  ): ChannelEventRecordMap[T] | undefined;

  // Saves the event to the channel
  saveEvent<T extends ChainEventNames>(
    channelId: Bytes32,
    data: ChannelEventRecordMap[T]
  ): Promise<void>;

  // Sets the channel in the store
  registerChannel(channelId: Bytes32): Promise<void>;

  // Returns true if channel is registered in store
  // FIXME: should be async, evt pipe isnt async supported :(
  hasChannel(channelId: Bytes32): boolean;
}

// Injectable storage interface that handles transaction saving
// TODO: should this associate transactions with channels? At the moment it
// does not need to know about the concept of "channels", but this may be
// useful for the onchain service/other applications to track
export interface TransactionSubmissionStoreInterface {
  // Used to save a transaction *before* it is sent to mempool
  saveTransactionRequest(channelId: Bytes32, tx: NoncedMinimalTransaction): Promise<void>;

  // Used to save a transaction *after* it has been sent to mempool
  saveTransactionResponse(channelId: Bytes32, tx: providers.TransactionResponse): Promise<void>;

  // Used to save a transaction *after* it is mined
  saveTransactionReceipt(channelId: Bytes32, tx: providers.TransactionReceipt): Promise<void>;

  // Used to save a transaction if it fails at any point
  saveFailedTransaction(
    channelId: Bytes32,
    tx: NoncedMinimalTransaction,
    reason: string
  ): Promise<void>;
}

export type Values<E> = E[keyof E];
