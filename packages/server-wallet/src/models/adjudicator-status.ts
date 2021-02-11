import {getChannelMode} from '@statechannels/nitro-protocol';
import {SignedState} from '@statechannels/wallet-core';
import Knex from 'knex';
import _ from 'lodash';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type AdjudicatorStatus =
  | {
      channelMode: 'Finalized' | 'Challenge';
      states: SignedState[];
    }
  | {channelMode: 'Open'};

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly finalizesAt: Uint48;
  readonly blockNumber: Uint48;
  readonly blockTimestamp: Uint48;
}
export class AdjudicatorStatusModel extends Model implements RequiredColumns {
  readonly channelId!: Bytes32;
  readonly finalizesAt!: Uint48;
  readonly blockNumber!: Uint48;
  readonly blockTimestamp!: Uint48;
  readonly states!: SignedState[];
  static tableName = 'adjudicator_status';
  static get idColumn(): string {
    return 'channelId';
  }

  static async getAdjudicatorStatus(knex: Knex, channelId: Bytes32): Promise<AdjudicatorStatus> {
    const result = await AdjudicatorStatusModel.query(knex).where({channelId}).first();

    if (!result) return {channelMode: 'Open'};
    return AdjudicatorStatusModel.convertResult(result);
  }

  static async setFinalized(
    knex: Knex,
    channelId: string,
    blockNumber: number,
    blockTimestamp: number,
    finalizesAt: number
  ): Promise<AdjudicatorStatus> {
    const existing = await AdjudicatorStatusModel.query(knex).where({channelId}).first();
    if (!existing) {
      await AdjudicatorStatusModel.query(knex).insert({
        channelId,
        blockNumber,
        blockTimestamp,
        finalizesAt,
      });
    }
    const result = await AdjudicatorStatusModel.query(knex)
      .patch({blockNumber, blockTimestamp})
      .where({channelId})
      .returning('*')
      .first();

    return AdjudicatorStatusModel.convertResult(result);
  }
  static async insertAdjudicatorStatus(
    knex: Knex,
    channelId: string,
    finalizesAt: number,
    states: SignedState[]
  ): Promise<AdjudicatorStatus> {
    const result = await AdjudicatorStatusModel.query(knex).insert({
      channelId,
      finalizesAt,
      blockNumber: 0,
      blockTimestamp: 0,
      states,
    });
    return AdjudicatorStatusModel.convertResult(result);
  }
  private static convertResult(result: AdjudicatorStatusModel | undefined): AdjudicatorStatus {
    if (!result || _.isEmpty(result)) {
      return {channelMode: 'Open'};
    }

    const {finalizesAt, blockTimestamp, states} = result;

    const channelMode = getChannelMode(finalizesAt, blockTimestamp);
    return channelMode === 'Open' ? {channelMode} : {channelMode, states};
  }

  public toResult(): AdjudicatorStatus {
    return AdjudicatorStatusModel.convertResult(this);
  }
}
