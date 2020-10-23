import _ from 'lodash';
import {Model, TransactionOrKnex} from 'objection';

import {Bytes32} from '../type-aliases';

export interface LedgerType {
  ledgerChannelId: Bytes32;
  assetHolderAddress: Bytes32;
}

export class Ledger extends Model implements LedgerType {
  ledgerChannelId!: LedgerType['ledgerChannelId'];
  assetHolderAddress!: LedgerType['assetHolderAddress'];

  static tableName = 'ledgers';
  static get idColumn(): string[] {
    return ['ledgerChannelId'];
  }

  static all(tx: TransactionOrKnex): Promise<Ledger[]> {
    return Ledger.query(tx).select();
  }

  static async isLedger(channelId: Bytes32, tx: TransactionOrKnex): Promise<boolean> {
    return !!Ledger.query(tx).findById(channelId);
  }
}
