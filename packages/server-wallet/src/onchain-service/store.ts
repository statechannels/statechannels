import {Bytes32} from '@statechannels/client-api-schema';
import {providers, BigNumber} from 'ethers';

import {
  ChannelEventRecord,
  OnchainServiceStoreInterface,
  ChannelEventRecordMap,
  TransactionStatus,
  TransactionStatusEventMap,
  NoncedMinimalTransaction,
  TransactionSubmissionStoreInterface,
  ChainEventNames,
} from './types';
import {isFundingEvent} from './utils';

// TODO: This will definitely change when we use to a more permanent store
type TransactionModel<T extends TransactionStatus> = {
  status: T;
  data: TransactionStatusEventMap[T];
};

export class TransactionSubmissionStore implements TransactionSubmissionStoreInterface {
  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  // private readonly transactions: Map<
  //   string,
  //   TransactionModel<keyof typeof TransactionStatuses>[]
  // > = new Map();

  // Stores transactions that are going to be sent to mempool
  // NOTE: assumes only one per channel
  private readonly requestedTransactions: Map<string, NoncedMinimalTransaction> = new Map();

  // Stores transactions that have been mined
  private readonly minedTransactions: Map<string, providers.TransactionResponse[]> = new Map();

  // Used to save a transaction *before* it is sent to mempool
  saveTransactionRequest(channelId: Bytes32, tx: NoncedMinimalTransaction): Promise<void> {
    // TODO: should this be handled at the store level?
    if (this.requestedTransactions.has(channelId)) {
      throw new Error('Transaction in process');
    }
    // Add to pending transactions
    this.requestedTransactions.set(channelId, tx);
    return Promise.resolve();
  }

  // Used to save a transaction *after* it has been sent to mempool
  saveTransactionResponse(_channelId: Bytes32, _tx: providers.TransactionResponse): Promise<void> {
    return Promise.resolve();
  }

  // Used to save a transaction *after* it is mined
  saveTransactionReceipt(channelId: Bytes32, receipt: providers.TransactionReceipt): Promise<void> {
    // Remove from pending if exists
    if (this.requestedTransactions.get(channelId)) {
      this.requestedTransactions.delete(channelId);
    }

    // Remove from mined if exists
    const existing = this.minedTransactions.get(channelId) || [];
    const idx = existing.findIndex(e => e.hash === receipt.transactionHash);
    const updated = [...existing];
    if (idx > -1) {
      updated.splice(idx, 1);
    }
    this.minedTransactions.set(channelId, updated);
    return Promise.resolve();
  }

  // Used to save a transaction if it fails at any point
  saveFailedTransaction(
    channelId: Bytes32,
    tx: NoncedMinimalTransaction,
    _reason: string
  ): Promise<void> {
    // Remove from pending if exists
    const pending = this.requestedTransactions.get(channelId);
    if (pending?.nonce === tx.nonce) {
      this.requestedTransactions.delete(channelId);
    }

    // Remove from mined if exists
    const existing = this.minedTransactions.get(channelId) || [];
    const idx = existing.findIndex(e => e.nonce === tx.nonce);
    const updated = [...existing];
    if (idx > -1) {
      updated.splice(idx, 1);
    }
    this.minedTransactions.set(channelId, updated);
    return Promise.resolve();
  }
}

export class OnchainServiceStore implements OnchainServiceStoreInterface {
  // NOTE: V0 has an in-memory store, which will eventually be
  // shifted to more permanent storage
  private readonly events: Map<string, ChannelEventRecord[]> = new Map();

  public getEvents(channelId: Bytes32): Promise<ChannelEventRecord[]> {
    return Promise.resolve(this.events.get(channelId) || []);
  }

  public getLatestEvent<T extends ChainEventNames>(
    channelId: Bytes32,
    _event: T
  ): ChannelEventRecordMap[T] {
    if (!this.hasChannel(channelId)) {
      throw new Error('Channel not found');
    }
    const unsorted = (this.events.get(channelId) || []).filter(e => isFundingEvent(e));
    const [latest] = unsorted.sort((a, b) => {
      // TODO: Can I safely sort by block number here?
      // TODO: Is there another generic way (ie timestamp) to return the latest
      // without the store needing to know details about the event fields
      if (a.type !== b.type) {
        throw new Error('This should never happen');
      }
      switch (b.type) {
        case 'Deposited': {
          return BigNumber.from(b.destinationHoldings)
            .sub(a.destinationHoldings)
            .toNumber();
        }
        default: {
          const e: never = b.type;
          throw new Error(`Unrecognized contract event type: ${e}`);
        }
      }
    });

    return latest;
  }

  public saveEvent<T extends ChainEventNames>(
    channelId: Bytes32,
    data: ChannelEventRecordMap[T]
  ): Promise<void> {
    const existing = this.events.get(channelId) || [];
    const idx = existing.findIndex(e => {
      return e.transactionHash === data.transactionHash;
    });
    if (idx === -1) {
      const updated = [...existing, data];
      this.events.set(channelId, updated);
    }
    return Promise.resolve();
  }

  public registerChannel(channelId: Bytes32): Promise<void> {
    if (!this.events.has(channelId)) {
      this.events.set(channelId, []);
    }

    return Promise.resolve();
  }

  public hasChannel(channelId: Bytes32): boolean {
    return this.events.has(channelId);
  }
}
