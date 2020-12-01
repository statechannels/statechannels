import {JSONSchema, Model} from 'objection';

import {Bytes32} from '../type-aliases';
import {chain_transactions} from '../db/migrations/20201201095500_chain_service_requests';

const ID_COLUMN = ['channelId', 'fingerprint'] as const;
const REQUIRED_COLUMNS = [...ID_COLUMN, 'timestamp'] as const;
interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly fingerprint: Bytes32;
  readonly timestamp: Date;
}

export class ChainTransaction extends Model implements RequiredColumns {
  static tableName = chain_transactions;
  static get idColumn(): string[] {
    return [...ID_COLUMN];
  }
  readonly channelId!: Bytes32;
  readonly fingerprint!: Bytes32;
  readonly timestamp!: Date;

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: [...REQUIRED_COLUMNS],
    };
  }
}
