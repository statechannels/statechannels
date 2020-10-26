import {Model, TransactionOrKnex} from 'objection';

import {Bytes32} from '../type-aliases';

export type LedgerRequestStatus =
  | 'pending' // Request added to DB to be approved or rejected by queue
  // | 'rejected' // Rejected due to lack of available funds TODO: Implement
  | 'succeeded' // Ledger update became supported and thus request succeeded
  | 'failed'; // Rejected for an unexpected reason (some error occurred) TODO: Implement

export interface LedgerRequestType {
  ledgerChannelId: Bytes32;
  channelToBeFunded: Bytes32;
  status: LedgerRequestStatus;
  type: 'fund' | 'defund';
}

export class LedgerRequest extends Model implements LedgerRequestType {
  channelToBeFunded!: LedgerRequestType['channelToBeFunded'];
  ledgerChannelId!: LedgerRequestType['ledgerChannelId'];
  status!: LedgerRequestType['status'];
  type!: LedgerRequestType['type'];

  static tableName = 'ledger_requests';
  static get idColumn(): string[] {
    return ['channelToBeFunded', 'type'];
  }

  static async getRequest(
    channelToBeFunded: Bytes32,
    type: 'fund' | 'defund',
    tx: TransactionOrKnex
  ): Promise<LedgerRequestType | undefined> {
    return LedgerRequest.query(tx).findById([channelToBeFunded, type]);
  }

  static async setRequest(request: LedgerRequestType, tx: TransactionOrKnex): Promise<void> {
    await LedgerRequest.query(tx).insert(request);
  }

  static async setRequestStatus(
    channelToBeFunded: Bytes32,
    type: 'fund' | 'defund',
    status: LedgerRequestStatus,
    tx: TransactionOrKnex
  ): Promise<void> {
    await LedgerRequest.query(tx)
      .findById([channelToBeFunded, type])
      .patch({status});
  }

  static async getPendingRequests(
    ledgerChannelId: string,
    tx: TransactionOrKnex
  ): Promise<LedgerRequestType[]> {
    return LedgerRequest.query(tx)
      .select()
      .where({ledgerChannelId, status: 'pending'});
  }

  static async getAllPendingRequests(tx: TransactionOrKnex): Promise<LedgerRequestType[]> {
    return LedgerRequest.query(tx).where({status: 'pending'});
  }

  static async requestLedgerFunding(
    channelToBeFunded: Bytes32,
    ledgerChannelId: Bytes32,
    tx: TransactionOrKnex
  ): Promise<void> {
    await this.setRequest(
      {
        ledgerChannelId,
        status: 'pending',
        channelToBeFunded,
        type: 'fund',
      },
      tx
    );
  }

  static async requestLedgerDefunding(
    channelToBeFunded: Bytes32,
    ledgerChannelId: Bytes32,
    tx: TransactionOrKnex
  ): Promise<void> {
    await this.setRequest(
      {
        ledgerChannelId,
        status: 'pending',
        channelToBeFunded,
        type: 'defund',
      },
      tx
    );
  }

  static async markLedgerRequestsSuccessful(
    requests: Bytes32[],
    type: 'fund' | 'defund',
    tx: TransactionOrKnex
  ): Promise<void> {
    await Promise.all(
      requests.map(req => LedgerRequest.setRequestStatus(req, type, 'succeeded', tx))
    );
  }
}
