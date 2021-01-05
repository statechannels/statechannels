import Knex from 'knex';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type ChallengingStatusResult =
  | {status: 'Finalized'; finalizedAt: number; finalizedBlockNumber: number}
  | {status: 'Not Finalized'};

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly finalizesAt: Uint48;
  readonly blockNumber: Uint48;
}
export class ChallengingStatus extends Model implements RequiredColumns {
  readonly channelId!: Bytes32;
  readonly finalizesAt!: Uint48;
  readonly blockNumber!: Uint48;
  static tableName = 'challenging_status';

  static async getChallengingStatus(
    knex: Knex,
    channelId: Bytes32
  ): Promise<ChallengingStatusResult> {
    const result = await ChallengingStatus.query(knex)
      .where({channelId})
      .first();

    return ChallengingStatus.convertResult(result);
  }

  static async updateChallengingStatus(
    knex: Knex,
    channelId: string,
    finalizesAt = 0,
    blockNumber = 0
  ): Promise<ChallengingStatusResult> {
    const existing = await ChallengingStatus.query(knex)
      .where({channelId})
      .first();

    if (!existing) {
      const result = await ChallengingStatus.query(knex).insert({
        channelId,
        finalizesAt,
        blockNumber,
      });
      return ChallengingStatus.convertResult(result);
    } else {
      const result = await ChallengingStatus.query(knex)
        .patch({finalizesAt, blockNumber})
        .where({channelId})
        .returning('*')
        .first();
      return ChallengingStatus.convertResult(result);
    }
  }
  private static convertResult(result: ChallengingStatus | undefined): ChallengingStatusResult {
    if (!result || result.finalizesAt === 0) {
      return {status: 'Not Finalized'};
    } else {
      const {finalizesAt, blockNumber} = result;
      return {status: 'Finalized', finalizedAt: finalizesAt, finalizedBlockNumber: blockNumber};
    }
  }

  public asResult(): ChallengingStatusResult {
    return ChallengingStatus.convertResult(this);
  }
}
