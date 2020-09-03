import {Address, Bytes32} from '@statechannels/client-api-schema';
import {providers, BigNumber} from 'ethers';
import {Evt} from 'evt';

// FIXME: replace with
// import {Wallet as ChannelWallet} from '@statechannels/server-wallet';
import {Wallet as ChannelWallet} from '..';

// Configuraiton for the onchain service, all values have defaults
// if not provided
export type OnchainServiceConfiguration = Partial<{
  transactionAttempts: number; // Maximum number of times a tx is retried
}>;
// Defaults for above option
export const DEFAULT_MAX_TRANSACTION_ATTEMPTS = 5;

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

// FIXME: should import from the `nitro-protocol` package, but it is using
// a different version of ethers so the bignumber types are all messed up
export type ContractEvent = 'Deposited';
export interface DepositedEvent {
  destination: string;
  amountDeposited: BigNumber;
  destinationHoldings: BigNumber;
}

// Used by the chain service to gather all channel events
export interface ChannelEventRecordMap {
  Deposited: DepositedEvent & {block: number};
}
export type ChannelEventRecord = Partial<
  {
    [K in keyof ChannelEventRecordMap]: ChannelEventRecordMap[K];
  }
>;
export type EvtContainer = {
  [K in keyof ChannelEventRecordMap]: Evt<ChannelEventRecordMap[K] & {block: number}>;
};

// Defines the interface for the service that is responsible for handling
// all onchain interactions (i.e. events and transactions)
export interface OnchainServiceInterface {
  registerChannel(channelId: Bytes32, assetHolders: Address[]): Promise<void>;

  // Sends a transaction to chain
  submitTransaction(
    channelId: Bytes32,
    tx: MinimalTransaction
  ): Promise<providers.TransactionResponse>;

  // TODO: remove in v1
  attachChannelWallet(wallet: ChannelWallet): void;
}

export type TransactionSubmissionOptions = Partial<{
  maxSendAttempts: number;
}>;

// An injectable service responsible for sending transactions to chain.
// Designed to be used so the OnchainServiceInterface can "set it and forget it"
export interface TransactionSubmissionServiceInterface {
  submitTransaction(
    minTx: MinimalTransaction,
    options?: TransactionSubmissionOptions
  ): Promise<providers.TransactionResponse>;
}
