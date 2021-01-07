import Knex from 'knex';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type ChallengeStatusResult =
  | {status: 'Challenge Finalized'; finalizedAt: number; finalizedBlockNumber: number}
  | {status: 'Challenge Active'; finalizesAt: number}
  | {status: 'No Challenge Detected'};

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly finalizesAt: Uint48;
  readonly blockNumber: Uint48;
}
export class ChallengeStatus extends Model implements RequiredColumns {
  readonly channelId!: Bytes32;
  readonly finalizesAt!: Uint48;
  readonly blockNumber!: Uint48;
  static tableName = 'challenge_status';
  static get idColumn(): string[] {
    return ['channelId'];
  }
  static async getChallengeStatus(knex: Knex, channelId: Bytes32): Promise<ChallengeStatusResult> {
    const result = await ChallengeStatus.query(knex)
      .where({channelId})
      .first();

    return ChallengeStatus.convertResult(result);
  }

  static async updateChallengeStatus(
    knex: Knex,
    channelId: string,
    finalizesAt: number,
    blockNumber: number
  ): Promise<ChallengeStatusResult> {
    const existing = await ChallengeStatus.query(knex)
      .where({channelId})
      .first();

    if (!existing) {
      const result = await ChallengeStatus.query(knex).insert({
        channelId,
        finalizesAt,
        blockNumber,
      });
      return ChallengeStatus.convertResult(result);
    } else {
      const result = await ChallengeStatus.query(knex)
        .patch({finalizesAt, blockNumber})
        .where({channelId})
        .returning('*')
        .first();
      return ChallengeStatus.convertResult(result);
    }
  }
  private static convertResult(result: ChallengeStatus | undefined): ChallengeStatusResult {
    if (!result || result.finalizesAt === 0) {
      return {status: 'No Challenge Detected'};
    }

    const {finalizesAt, blockNumber} = result;
    if (finalizesAt > blockNumber) {
      return {status: 'Challenge Active', finalizesAt};
    } else {
      return {
        status: 'Challenge Finalized',
        finalizedAt: finalizesAt,
        finalizedBlockNumber: blockNumber,
      };
    }
  }

  public toResult(): ChallengeStatusResult {
    return ChallengeStatus.convertResult(this);
  }
}
