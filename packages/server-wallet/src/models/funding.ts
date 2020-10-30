import {JSONSchema, Model} from 'objection';
import {Zero} from '@statechannels/wallet-core';
import Knex from 'knex';

import {Uint256, Bytes32, Address} from '../type-aliases';
import {logger} from '../logger';

type TransferredOutEntry = {toAddress: Address; amount: Uint256};

export const REQUIRED_COLUMNS = ['channelId', 'amount', 'assetHolder', 'transferredOut'] as const;
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

  static get jsonSchema(): JSONSchema {
    return {
      type: 'object',
      required: [...REQUIRED_COLUMNS],
      properties: {
        transferredOut: {
          type: 'array',
          items: {type: 'object'},
        },
      },
    };
  }

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
      return await Funding.query(knex).insert({channelId, amount, assetHolder, transferredOut: []});
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
        const transferredOut = existing.transferredOut.concat({toAddress, amount});
        return await Funding.query(tx)
          .patch({transferredOut})
          .where({channelId, assetHolder})
          .returning('*')
          .first();
      }
    });
  }
}
