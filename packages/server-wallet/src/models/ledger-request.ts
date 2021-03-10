import {BN} from '@statechannels/wallet-core';
import {Model, TransactionOrKnex} from 'objection';

import {Uint256, Destination, Bytes32} from '../type-aliases';

export type LedgerRequestStatus =
  | 'queued'
  | 'cancelled'
  | 'pending' // Request added to DB to be handled by ProcessLedgerQueue
  | 'succeeded' // Ledger update became supported and thus request succeeded
  | 'insufficient-funds'
  | 'inconsistent' // channel already exists but has a different total
  | 'failed'; // if the ledger closes, or there's a protocol error

export interface LedgerRequestType {
  ledgerChannelId: Destination;
  channelToBeFunded: Destination;
  status: LedgerRequestStatus;
  amountA: Uint256;
  amountB: Uint256;
  lastSeenAgreedState: number | null;
  missedOpportunityCount: number;
  type: 'fund' | 'defund';
}

export class LedgerRequest extends Model implements LedgerRequestType {
  channelToBeFunded!: LedgerRequestType['channelToBeFunded'];
  ledgerChannelId!: LedgerRequestType['ledgerChannelId'];
  status!: LedgerRequestType['status'];
  type!: LedgerRequestType['type'];
  amountA!: Uint256;
  amountB!: Uint256;
  missedOpportunityCount!: number;
  lastSeenAgreedState!: number | null;

  static tableName = 'ledger_requests';
  static get idColumn(): string[] {
    return ['channelToBeFunded', 'type'];
  }

  static async getRequest(
    channelToBeFunded: Bytes32,
    type: 'fund' | 'defund',
    tx: TransactionOrKnex
  ): Promise<LedgerRequest | undefined> {
    return LedgerRequest.query(tx).findById([channelToBeFunded, type]);
  }

  static async setRequest(
    request: Omit<LedgerRequestType, 'missedOpportunityCount' | 'lastSeenAgreedState'> & {
      missedOpportunityCount?: number;
      lastSeenAgreedState?: null | number;
    },
    tx: TransactionOrKnex
  ): Promise<void> {
    await LedgerRequest.query(tx).insert({
      ...request,
      missedOpportunityCount: request.missedOpportunityCount || 0,
      lastSeenAgreedState: request.lastSeenAgreedState || null,
    });
  }

  async markAsFailed(tx: TransactionOrKnex): Promise<void> {
    await LedgerRequest.query(tx)
      .findById([this.channelToBeFunded, this.type])
      .patch({status: 'failed'});
  }

  static async setRequestStatus(
    channelToBeFunded: Bytes32,
    type: 'fund' | 'defund',
    status: LedgerRequestStatus,
    tx: TransactionOrKnex
  ): Promise<void> {
    await LedgerRequest.query(tx).findById([channelToBeFunded, type]).patch({status});
  }

  static async getActiveRequests(
    ledgerChannelId: string,
    tx: TransactionOrKnex
  ): Promise<LedgerRequest[]> {
    return LedgerRequest.query(tx)
      .select()
      .where({ledgerChannelId, status: 'pending'})
      .orWhere({ledgerChannelId, status: 'queued'});
  }

  static async ledgersWithNewReqeustsIds(tx: TransactionOrKnex): Promise<string[]> {
    return (
      await LedgerRequest.query(tx).column('ledgerChannelId').whereNull('lastSeenAgreedState')
    ).map(lr => lr.ledgerChannelId);
  }

  static async saveAll(requests: LedgerRequest[], tx: TransactionOrKnex): Promise<void> {
    // TODO: can we do a batch update?
    for (const request of requests) {
      await LedgerRequest.query(tx)
        .findById([request.channelToBeFunded, request.type])
        .update(request);
    }
  }

  static async requestLedgerFunding(
    channelToBeFunded: Destination,
    ledgerChannelId: Destination,
    amountA: Uint256, // amount to be removed from/added to participant 0's balance
    amountB: Uint256, // amount to be removed from/added to participant 0's balance
    tx: TransactionOrKnex
  ): Promise<void> {
    await this.setRequest(
      {
        ledgerChannelId,
        status: 'queued',
        channelToBeFunded,
        amountA,
        amountB,
        type: 'fund',
      },
      tx
    );
  }

  static async requestLedgerDefunding(
    channelToBeFunded: Destination,
    ledgerChannelId: Destination,
    amountA: Uint256, // amount to be removed from/added to participant 0's balance
    amountB: Uint256, // amount to be removed from/added to participant 0's balance
    tx: TransactionOrKnex
  ): Promise<void> {
    await this.setRequest(
      {
        ledgerChannelId,
        status: 'queued',
        channelToBeFunded,
        amountA,
        amountB,
        type: 'defund',
      },
      tx
    );
  }

  public get isFund(): boolean {
    return this.type === 'fund';
  }

  public get isDefund(): boolean {
    return this.type === 'defund';
  }

  public get isQueued(): boolean {
    return this.status === 'queued';
  }

  public get isPending(): boolean {
    return this.status === 'pending';
  }

  public get isActive(): boolean {
    return this.isQueued || this.isPending;
  }

  public get isTerminal(): boolean {
    return !this.isActive;
  }

  static async markLedgerRequestsSuccessful(
    requests: Destination[],
    type: 'fund' | 'defund',
    tx: TransactionOrKnex
  ): Promise<void> {
    await Promise.all(
      requests.map(req => LedgerRequest.setRequestStatus(req, type, 'succeeded', tx))
    );
  }

  public get totalAmount(): Uint256 {
    return BN.add(this.amountA, this.amountB);
  }
}
