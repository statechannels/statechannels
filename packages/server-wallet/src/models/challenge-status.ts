import {State} from '@statechannels/wallet-core';
import Knex from 'knex';
import _ from 'lodash';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type ChallengeStatusResult =
  | {
      status: 'Challenge Finalized';
      finalizedAt: number;
      challengeState: State;
      finalizedBlockNumber: number;
    }
  | {status: 'Challenge Active'; finalizesAt: number; challengeState: State}
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
  readonly challengeState!: State;
  static tableName = 'challenge_status';
  static get idColumn(): string[] {
    return ['channelId'];
  }

  static async getChallengeStatus(knex: Knex, channelId: Bytes32): Promise<ChallengeStatusResult> {
    const result = await ChallengeStatus.query(knex).where({channelId}).first();

    return ChallengeStatus.convertResult(result);
  }

  static async setFinalized(
    knex: Knex,
    channelId: string,
    blockNumber: number
  ): Promise<ChallengeStatusResult> {
    const existing = await ChallengeStatus.query(knex).where({channelId});
    if (!existing) {
      throw new Error('No existing challenge found to update');
    }
    const result = await ChallengeStatus.query(knex)
      .patch({blockNumber})
      .where({channelId})
      .returning('*')
      .first();

    return ChallengeStatus.convertResult(result);
  }
  static async insertChallengeStatus(
    knex: Knex,
    channelId: string,
    finalizesAt: number,
    challengeState: State
  ): Promise<ChallengeStatusResult> {
    const result = await ChallengeStatus.query(knex).insert({
      channelId,
      finalizesAt,
      blockNumber: 0,
      challengeState,
    });
    return ChallengeStatus.convertResult(result);
  }
  private static convertResult(result: ChallengeStatus | undefined): ChallengeStatusResult {
    if (!result || _.isEmpty(result)) {
      return {status: 'No Challenge Detected'};
    }

    const {finalizesAt, blockNumber, challengeState} = result;

    if (finalizesAt > blockNumber) {
      return {status: 'Challenge Active', finalizesAt, challengeState};
    } else {
      return {
        status: 'Challenge Finalized',
        finalizedAt: finalizesAt,
        finalizedBlockNumber: blockNumber,
        challengeState,
      };
    }
  }

  public toResult(): ChallengeStatusResult {
    return ChallengeStatus.convertResult(this);
  }
}
