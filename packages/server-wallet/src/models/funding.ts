import {JSONSchema, Model} from 'objection';
import {Address, Destination, Zero} from '@statechannels/wallet-core';
import Knex from 'knex';

import {Uint256, Bytes32} from '../type-aliases';

export type TransferredOutEntry = {toAddress: Destination; amount: Uint256};

const REQUIRED_COLUMNS = ['channelId', 'amount', 'asset', 'transferredOut'] as const;
interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly amount: Uint256;
  readonly asset: Address;
  readonly transferredOut: TransferredOutEntry[];
}

export class Funding extends Model implements RequiredColumns {
  static tableName = 'funding';
  static get idColumn(): string[] {
    return ['channelId', 'asset'];
  }
  readonly channelId!: Bytes32;
  readonly amount!: Uint256;
  readonly asset!: Address;
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

  static async getFundingAmount(knex: Knex, channelId: Bytes32, asset: Address): Promise<Uint256> {
    const result = await Funding.query(knex).where({channelId, asset}).first();

    return result ? result.amount : Zero;
  }

  static async updateFunding(
    knex: Knex,
    channelId: Bytes32,
    amount: Uint256,
    asset: Address
  ): Promise<Funding> {
    const existing = await Funding.query(knex).where({channelId, asset}).first();

    if (!existing) {
      return await Funding.query(knex).insert({
        channelId,
        amount,
        asset,
        transferredOut: [],
      });
    } else {
      return await Funding.query(knex)
        .patch({amount})
        .where({channelId, asset})
        .returning('*')
        .first();
    }
  }

  static async updateTransferredOut(
    knex: Knex,
    channelId: Bytes32,
    asset: Address,
    transferredOut: TransferredOutEntry[]
  ): Promise<Funding> {
    return knex.transaction(async tx => {
      const errorMessage = `Expected for funding row to exists with channelId ${channelId}, asset ${asset}`;
      const existing = await Funding.query(tx)
        .where({channelId, asset})
        .first()
        .throwIfNotFound({
          message: errorMessage,
          data: {channelId, asset, transferredOutArr: transferredOut},
        });

      const newTransferredOut = existing.transferredOut.concat(transferredOut);
      return await Funding.query(tx)
        .patch({transferredOut: newTransferredOut})
        .where({channelId, asset})
        .returning('*')
        .first();
    });
  }
}
