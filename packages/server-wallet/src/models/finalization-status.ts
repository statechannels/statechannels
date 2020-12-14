import Knex from 'knex';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type FinalizationStatusResult =
  | {status: 'Finalized'; finalizedAt: number; finalizedBlockNumber: number}
  | {status: 'Not Finalized'};

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly finalizesAt: Uint48;
  readonly blockNumber: Uint48;
}
export class FinalizationStatus extends Model implements RequiredColumns {
  readonly channelId!: Bytes32;
  readonly finalizesAt!: Uint48;
  readonly blockNumber!: Uint48;
  static tableName = 'finalization_status';

  static async getFinalizationStatus(
    knex: Knex,
    channelId: Bytes32
  ): Promise<FinalizationStatusResult> {
    const result = await FinalizationStatus.query(knex)
      .where({channelId})
      .first();

    return FinalizationStatus.convertResult(result);
  }

  static async updateFinalizationStatus(
    knex: Knex,
    channelId: string,
    finalizesAt = 0,
    blockNumber = 0
  ): Promise<FinalizationStatusResult> {
    const existing = await FinalizationStatus.query(knex)
      .where({channelId})
      .first();

    if (!existing) {
      const result = await FinalizationStatus.query(knex).insert({
        channelId,
        finalizesAt,
        blockNumber,
      });
      return FinalizationStatus.convertResult(result);
    } else {
      const result = await FinalizationStatus.query(knex)
        .patch({finalizesAt, blockNumber})
        .where({channelId})
        .returning('*')
        .first();
      return FinalizationStatus.convertResult(result);
    }
  }
  private static convertResult(result: FinalizationStatus | undefined): FinalizationStatusResult {
    if (!result || result.finalizesAt === 0) {
      return {status: 'Not Finalized'};
    } else {
      const {finalizesAt, blockNumber} = result;
      return {status: 'Finalized', finalizedAt: finalizesAt, finalizedBlockNumber: blockNumber};
    }
  }

  public asResult(): FinalizationStatusResult {
    return FinalizationStatus.convertResult(this);
  }
}
