import _ from 'lodash';
import {Model, Transaction, TransactionOrKnex} from 'objection';

import {Bytes32} from '../type-aliases';

import {Channel} from './channel';

// TODO: Is this the same as an objective?
// GK: there is a one to many relation from ledgers to channels we may not need this model at all
export type LedgerRequestStatus =
  | 'pending' // Request added to DB to be approved or rejected by queue
  // | 'rejected' // Rejected due to lack of available funds TODO: Implement
  | 'succeeded'; // Ledger update became supported and thus request succeeded
// | 'failed'; // Rejected for an unexpected reason (some error occurred) TODO: Implement

export interface LedgerRequestType {
  ledgerChannelId: Bytes32;
  channelToBeFunded: Bytes32;
  status: LedgerRequestStatus;
}

export class LedgerRequest extends Model implements LedgerRequestType {
  channelToBeFunded!: LedgerRequestType['channelToBeFunded'];
  ledgerChannelId!: LedgerRequestType['ledgerChannelId'];
  status!: LedgerRequestType['status'];

  static tableName = 'ledger_requests';
  static get idColumn(): string[] {
    return ['channelToBeFunded'];
  }

  static async getRequest(
    channelToBeFunded: Bytes32,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<LedgerRequestType> {
    return LedgerRequest.query(tx).findById(channelToBeFunded);
  }

  static async setRequest(
    request: LedgerRequestType,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    await LedgerRequest.query(tx).insert(request); // should throw error if it already exists
  }

  static async setRequestStatus(
    channelToBeFunded: Bytes32,
    status: LedgerRequestStatus,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: Transaction
  ): Promise<void> {
    await LedgerRequest.query(tx)
      .findById(channelToBeFunded)
      .patch({status});
  }

  static async getPendingRequests(
    ledgerChannelId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    tx?: TransactionOrKnex
  ): Promise<LedgerRequestType[]> {
    return LedgerRequest.query(tx)
      .select()
      .where({ledgerChannelId, status: 'pending'});
  }

  static async getAllPendingRequests(tx: TransactionOrKnex): Promise<LedgerRequestType[]> {
    return tx.transaction(async trx => {
      return LedgerRequest.query(trx).findByIds(
        (await Channel.query(trx).select('channelId')).map(l => l.channelId)
      );
    });
  }

  static async requestLedgerFunding(
    channelToBeFunded: Bytes32,
    ledgerChannelId: Bytes32,
    tx: Transaction
  ): Promise<void> {
    await this.setRequest(
      {
        ledgerChannelId,
        status: 'pending',
        channelToBeFunded,
      },
      tx
    );
  }

  static async markLedgerRequestsSuccessful(
    channelsToBeFunded: Bytes32[],
    tx?: Transaction
  ): Promise<void> {
    await Promise.all(
      channelsToBeFunded.map(channelToBeFunded =>
        LedgerRequest.setRequestStatus(channelToBeFunded, 'succeeded', tx)
      )
    );
  }
}
