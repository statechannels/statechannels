import {JSONSchema, Model, TransactionOrKnex} from 'objection';

import {Bytes32} from '../type-aliases';
import {chain_service_requests} from '../db/migrations/20201201095500_chain_service_requests';

export const requestTimeout = 10 * 60 * 1_000;

const ID_COLUMN = ['channelId', 'request'] as const;
const REQUIRED_COLUMNS = [...ID_COLUMN, 'timestamp'] as const;

type Request = 'fund' | 'withdraw' | 'challenge';

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly request: Request;
  readonly timestamp: Date;
}

export class ChainServiceRequest extends Model implements RequiredColumns {
  static tableName = chain_service_requests;
  static get idColumn(): string[] {
    return [...ID_COLUMN];
  }
  readonly channelId!: Bytes32;
  readonly request!: Request;
  readonly timestamp!: Date;
  readonly attempts!: number;

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: [...REQUIRED_COLUMNS],
    };
  }

  static async insertOrUpdate(
    channelId: Bytes32,
    request: Request,
    tx: TransactionOrKnex
  ): Promise<void> {
    return tx.transaction(async trx => {
      const insertQuery = trx(this.tableName).insert({
        channelId,
        request,
        timestamp: new Date().toISOString(),
      });
      return trx.raw(
        `
          ${insertQuery} ON CONFLICT (channel_id, request)
          DO UPDATE SET
            (timestamp, attempts) = (EXCLUDED.timestamp, chain_service_requests.attempts + 1)
        `
      );
    });
  }

  isValid(): boolean {
    return this.attempts >= 2 || new Date().getTime() - this.timestamp.getTime() < requestTimeout;
  }
}
