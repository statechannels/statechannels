import {Model} from 'objection';
import {Zero} from '@statechannels/wallet-core';
import Knex from 'knex';

import {Uint256, Bytes32, Address} from '../type-aliases';
import {logger} from '../logger';

type TransferredOutEntry = {toAddress: Address; amount: Uint256};

export const REQUIRED_COLUMNS = {
  channelId: 'channelId',
  amount: 'amount',
  assetHolder: 'assetHolder',
  transferredOut: 'transferredOut',
};
export interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly amount: Uint256;
  readonly assetHolder: Address;
  readonly transferredOut: TransferredOutEntry[];
}

export class Funding extends Model implements RequiredColumns {
  static tableName = 'funding';
  static get idColumn(): string[] {
    return ['channelId', 'assetHolder'];
  }
  readonly channelId!: Bytes32;
  readonly amount!: Uint256;
  readonly assetHolder!: Address;
  readonly transferredOut!: TransferredOutEntry[];

  static async getFundingAmount(
    knex: Knex,
    channelId: Bytes32,
    assetHolder: Address
  ): Promise<Uint256> {
    const result = await Funding.query(knex)
      .where({channelId, assetHolder})
      .first();

    return result ? result.amount : Zero;
  }

  static async updateFunding(
    knex: Knex,
    channelId: Bytes32,
    amount: Uint256,
    assetHolder: Address
  ): Promise<Funding> {
    const existing = await Funding.query(knex)
      .where({channelId, assetHolder})
      .first();

    if (!existing) {
      return await Funding.query(knex).insert({channelId, amount, assetHolder});
    } else {
      return await Funding.query(knex)
        .patch({channelId, amount, assetHolder})
        .where({channelId, assetHolder})
        .returning('*')
        .first();
    }
  }

  static async updateTransferredOut(
    knex: Knex,
    channelId: Bytes32,
    assetHolder: Address,
    toAddress: Uint256,
    amount: Address
  ): Promise<Funding> {
    return knex.transaction(async tx => {
      const existing = await Funding.query(tx)
        .where({channelId, assetHolder})
        .first();

      if (!existing) {
        const errorMessage = `Expected for funding row to exists with channelId ${channelId}, assetHolder ${assetHolder}`;
        logger.error(errorMessage, {channelId, assetHolder, toAddress, amount});
        throw new Error(errorMessage);
      } else {
        existing.transferredOut;
        return await Funding.query(tx)
          .patch({transferredOut: existing.transferredOut.concat({toAddress, amount})})
          .where({channelId, assetHolder})
          .returning('*')
          .first();
      }
    });
  }
}
