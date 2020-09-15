import {providers} from 'ethers';
import {Model} from 'objection';

import {Uint256, Bytes32, Address, Bytes, Uint48} from '../../type-aliases';
import {NoncedMinimalTransaction, TransactionStatus} from '../types';

// These columns are the ones that are required when you
// submit a transaction via the transaction submission service
export const REQUIRED_COLUMNS = {
  channelId: 'channelId',
  value: 'value',
  to: 'to',
  from: 'from',
  data: 'data',
  nonce: 'nonce',
  status: 'status',
};
export interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly value: Uint256;
  readonly to: Address;
  readonly from: Address;
  readonly data: Bytes;
  readonly nonce: Uint48; // TODO: Uint256?
  readonly chainId: Bytes32;
  readonly status: TransactionStatus;
}

// These columns are the ones that may be filled out once
// the transaction is broadcast and mined (they come from
// the providers.TransactionResponse and
// providers.TransactionReceipt types, respectively) and
// a slot for storing the error message of a tx
export const NULLABLE_COLUMNS = {
  // Response fields
  hash: 'hash',
  raw: 'raw',
  gasLimit: 'gasLimit',
  gasPrice: 'gasPrice',

  // Receipt fields
  gasUsed: 'gasUsed',
  cumulativeGasUsed: 'cumulativeGasUsed',
  logs: 'logs',
  blockNumber: 'blockNumber',
  blockHash: 'blockHash',

  // Failure fields
  error: 'error',
};

export type NullableColumns = {
  // Response fields
  readonly hash: Bytes32;
  readonly raw: Bytes;
  readonly gasLimit: Uint256;
  readonly gasPrice: Uint256;

  // Receipt fields
  readonly gasUsed: Uint256;
  readonly cumulativeGasUsed: Uint256;
  readonly logs: Bytes; // TODO: right type? is ethers.Log[]
  readonly blockNumber: Uint48;
  readonly blockHash: Bytes32;

  // Failure fields
  readonly error: string;
};

export const CHAIN_TRANSACTION_COLUMNS = {
  ...REQUIRED_COLUMNS,
  ...NULLABLE_COLUMNS,
};

export class ChainTransaction extends Model implements RequiredColumns {
  // Setup
  static tableName = 'chain_transaction';
  readonly id!: string; // TODO: is this needed for the computed id?

  // Required Columns
  readonly channelId!: Bytes32;
  readonly value!: Uint256;
  readonly to!: Address;
  readonly from!: Address;
  readonly data!: Bytes;
  readonly nonce!: Uint48; // Uint256?
  readonly chainId!: Bytes32;
  readonly status!: TransactionStatus;

  // Nullable columns
  readonly hash?: Bytes32;
  readonly raw?: Bytes;
  readonly gasLimit?: Uint256;
  readonly gasPrice?: Uint256;

  readonly gasUsed?: Uint256;
  readonly cumulativeGasUsed?: Uint256;
  readonly logs?: Bytes;
  readonly blockNumber?: Uint48;
  readonly blockHash?: Bytes32;

  readonly error?: string;

  static get idColumn(): string[] {
    // could use `from/nonce` but will not work in failure cases (if failed)
    // for nonce reasons
    return ['channelId', 'data'];
  }

  // Used to save a transaction *before* it is sent to mempool
  static async saveTransactionRequest(
    _channelId: Bytes32,
    _tx: NoncedMinimalTransaction
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  // Used to save a transaction *after* it has been sent to mempool
  static async saveTransactionResponse(
    _channelId: Bytes32,
    _tx: providers.TransactionResponse
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  // Used to save a transaction *after* it is mined
  static async saveTransactionReceipt(
    _channelId: Bytes32,
    _tx: providers.TransactionReceipt
  ): Promise<void> {
    throw new Error('Method not implemented');
  }

  // Used to save a transaction if it fails at any point
  static async saveFailedTransaction(
    _channelId: Bytes32,
    _tx: NoncedMinimalTransaction,
    _reason: string
  ): Promise<void> {
    throw new Error('Method not implemented');
  }
}
