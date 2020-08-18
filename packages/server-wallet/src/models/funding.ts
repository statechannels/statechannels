import {Model, Transaction} from 'objection';
import {BigNumberish} from 'ethers';
import {Zero} from '@statechannels/wallet-core';

import {Uint256, Bytes32, Address} from '../type-aliases';

import {Channel} from './channel';

export const REQUIRED_COLUMNS = {
  channelId: 'channelId',
  amount: 'amount',
  assetHolder: 'assetHolder',
};
export interface RequiredColumns {
  readonly channelId: Bytes32;
  readonly amount: Uint256;
  readonly assetHolder: Address;
}

export class Funding extends Model implements RequiredColumns {
  static tableName = 'funding';
  static get idColumn(): string[] {
    return ['channelId', 'assetHolder'];
  }
  static relationMappings = {
    signingWallet: {
      relation: Model.BelongsToOneRelation,
      modelClass: Channel,
      join: {
        from: 'funding.channelId',
        to: 'channel.channelId',
      },
    },
  };
  readonly channelId!: Bytes32;
  readonly amount!: Uint256;
  readonly assetHolder!: Address;

  static async getFundingAmount(
    channelId: Bytes32,
    assetHolder: Address,
    tx: Transaction | undefined
  ): Promise<BigNumberish> {
    const result = await Funding.query(tx)
      .where({channelId, assetHolder})
      .first();

    return result ? result.amount : Zero;
  }

  static async updateFunding(
    channelId: Bytes32,
    amount: Uint256,
    assetHolder: Address,
    tx: Transaction | undefined
  ): Promise<Funding> {
    const existing = await Funding.query(tx)
      .where({channelId, assetHolder})
      .first();

    if (!existing) {
      return await Funding.query(tx).insert({channelId, amount, assetHolder});
    } else {
      return await Funding.query(tx)
        .update({channelId, amount, assetHolder})
        .where({channelId, assetHolder})
        .returning('*')
        .first();
    }
  }
}
