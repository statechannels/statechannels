import {Bytes32} from '@statechannels/client-api-schema';
import {providers} from 'ethers';

import {
  ChannelEventRecord,
  OnchainServiceStoreInterface,
  ContractEventName,
  ChannelEventRecordMap,
  MinimalTransaction,
  TransactionStatus,
  TransactionStatusEventMap,
  TransactionStatuses,
  NoncedMinimalTransaction,
  TransactionSubmissionStoreInterface,
} from './types';

// TODO: This will definitely change when we use to a more permanent store
type TransactionModel<T extends TransactionStatus> = {
  status: T;
  data: TransactionStatusEventMap[T];
};

export class TransactionSubmissionStore implements TransactionSubmissionStoreInterface {
  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  private readonly transactions: Map<
    string,
    TransactionModel<keyof typeof TransactionStatuses>[]
  > = new Map();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  // Used to save a transaction *before* it is sent to mempool
  saveTransactionRequest(channelId: Bytes32, tx: NoncedMinimalTransaction): Promise<void> {
    const existing = this.transactions.get(channelId) || [];
    const idx = existing.findIndex(
      e => e.status === 'pending' && (e.data as NoncedMinimalTransaction).nonce === tx.nonce
    );
    return Promise.resolve(this._updateTransactions(channelId, idx, {status: 'pending', data: tx}));
  }

  // Used to save a transaction *after* it has been sent to mempool
  saveTransactionResponse(channelId: Bytes32, tx: providers.TransactionResponse): Promise<void> {
    // Find the pending transaction
    const existing = this.transactions.get(channelId) || [];
    const idx = existing.findIndex(
      e => e.status === 'pending' && (e.data as NoncedMinimalTransaction).nonce === tx.nonce
    );
    return Promise.resolve(
      this._updateTransactions(channelId, idx, {status: 'submitted', data: tx})
    );
  }

  // Used to save a transaction *after* it is mined
  saveTransactionReceipt(channelId: Bytes32, receipt: providers.TransactionReceipt): Promise<void> {
    // Find the submitted transaction
    const existing = this.transactions.get(channelId) || [];
    const idx = existing.findIndex(
      e =>
        e.status === 'submitted' &&
        (e.data as providers.TransactionResponse).hash === receipt.transactionHash
    );
    return Promise.resolve(
      this._updateTransactions(channelId, idx, {status: 'success', data: receipt})
    );
  }

  // Used to save a transaction if it fails at any point
  saveFailedTransaction(
    channelId: Bytes32,
    tx: NoncedMinimalTransaction,
    reason: string
  ): Promise<void> {
    // Find the submitted transaction
    const existing = this.transactions.get(channelId) || [];
    // The transaction can fail at any time before it is sent or during
    // mining, so look by nonce
    const idx = existing.findIndex(
      e => (e.data as providers.TransactionResponse | NoncedMinimalTransaction).nonce === tx.nonce
    );
    return Promise.resolve(
      this._updateTransactions(channelId, idx, {status: 'failed', data: {...tx, reason}})
    );
  }

  private _updateTransactions<T extends TransactionStatus>(
    channelId: Bytes32,
    previousRecordIndex: number,
    data: TransactionModel<T>
  ): void {
    // Get existing channel transactions
    const existing = this.transactions.get(channelId) || [];

    // Update record
    if (previousRecordIndex === -1) {
      // No record of pending transaction found
      existing.push(data);
    } else {
      // Update existing record
      existing[previousRecordIndex] = data;
    }
    this.transactions.set(channelId, existing);
  }
}

export class OnchainServiceStore implements OnchainServiceStoreInterface {
  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  private readonly events: Map<string, ChannelEventRecord[]> = new Map();

  // Stores transactions that are going to be sent to mempool
  private readonly requestedTransactions: Map<
    string,
    MinimalTransaction & {nonce: number}
  > = new Map();

  // Stores transactions that are currently in the mempool
  private readonly pendingTransactions: Map<string, providers.TransactionResponse> = new Map();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() {}

  public getEvents(channelId: Bytes32): Promise<ChannelEventRecord[]> {
    return Promise.resolve(this.events.get(channelId) || []);
  }

  public getLatestEvent<T extends ContractEventName>(
    channelId: Bytes32,
    event: T
  ): ChannelEventRecordMap[T] {
    if (!this.hasChannel(channelId)) {
      throw new Error('Channel not found');
    }
    const unsorted = (this.events.get(channelId) || []).filter(e => e.type === event);
    const [latest] = unsorted.sort((a, b) => {
      // TODO: Can I safely sort by block number here?
      // TODO: Is there another generic way (ie timestamp) to return the latest
      // without the store needing to know details about the event fields
      if (a.type !== b.type) {
        throw new Error('This should never happen');
      }
      switch (b.type) {
        case 'Deposited': {
          return b.destinationHoldings.sub(a.destinationHoldings).toNumber();
        }
        default: {
          const e: never = b.type;
          throw new Error(`Unrecognized contract event type: ${e}`);
        }
      }
    });

    return latest;
  }

  public saveEvent<T extends ContractEventName>(
    channelId: Bytes32,
    data: ChannelEventRecordMap[T]
  ): Promise<void> {
    const existing = this.events.get(channelId) || [];
    const idx = existing.findIndex(e => {
      return JSON.stringify(e) === JSON.stringify(data);
    });
    if (idx === -1) {
      const updated = [...existing, data];
      this.events.set(channelId, updated);
    }
    return Promise.resolve();
  }

  public createChannel(channelId: Bytes32): Promise<void> {
    if (!this.events.has(channelId)) {
      this.events.set(channelId, []);
    }

    return Promise.resolve();
  }

  public hasChannel(channelId: Bytes32): boolean {
    return this.events.has(channelId);
  }
}
