import {SignedState} from '@statechannels/wallet-core';
import Knex from 'knex';
import _ from 'lodash';
import {Model} from 'objection';

import {Bytes32, Uint48} from '../type-aliases';

export type AdjudicatorStatus =
  | {
      status: 'Channel Finalized';
      finalizedAt: number;
      states: SignedState[];
      finalizedBlockNumber: number;
      outcomePushed: boolean;
    }
  | {status: 'Challenge Active'; finalizesAt: number; states: SignedState[]}
  | {status: 'Nothing'};

interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly finalizesAt: Uint48;
  readonly blockNumber: Uint48;
}
export class AdjudicatorStatusModel extends Model implements RequiredColumns {
  readonly channelId!: Bytes32;
  readonly finalizesAt!: Uint48;
  readonly blockNumber!: Uint48;
  readonly states!: SignedState[];
  readonly outcomePushed!: boolean | undefined;
  static tableName = 'adjudicator_status';
  static get idColumn(): string[] {
    return ['channelId'];
  }

  static async getAdjudicatorStatus(knex: Knex, channelId: Bytes32): Promise<AdjudicatorStatus> {
    const result = await AdjudicatorStatusModel.query(knex).where({channelId}).first();

    if (!result) return {status: 'Nothing'};
    return AdjudicatorStatusModel.convertResult(result);
  }

  static async setFinalized(
    knex: Knex,
    channelId: string,
    blockNumber: number,
    outcomePushed: boolean
  ): Promise<AdjudicatorStatus> {
    const existing = await AdjudicatorStatusModel.query(knex).where({channelId});
    if (!existing) {
      await AdjudicatorStatusModel.query(knex).insert({channelId, blockNumber});
    }
    const result = await AdjudicatorStatusModel.query(knex)
      .patch({blockNumber, outcomePushed})
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
      states,
    });
    return AdjudicatorStatusModel.convertResult(result);
  }
  private static convertResult(result: AdjudicatorStatusModel | undefined): AdjudicatorStatus {
    if (!result || _.isEmpty(result)) {
      return {status: 'Nothing'};
    }

    const {finalizesAt, blockNumber, states, outcomePushed} = result;

    if (finalizesAt > blockNumber) {
      return {status: 'Challenge Active', finalizesAt, states};
    } else {
      return {
        status: 'Channel Finalized',
        finalizedAt: finalizesAt,
        finalizedBlockNumber: blockNumber,
        states,
        outcomePushed: outcomePushed || false,
      };
    }
  }

  public toResult(): AdjudicatorStatus {
    return AdjudicatorStatusModel.convertResult(this);
  }
}
