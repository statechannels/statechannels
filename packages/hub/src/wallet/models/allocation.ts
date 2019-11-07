import {Address, Uint256, Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import LedgerCommitment from './channelCommitment';

export default class Allocation extends Model {
  static tableName = 'allocations';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    commitment: {
      relation: Model.BelongsToOneRelation,
      modelClass: LedgerCommitment,
      join: {
        from: 'allocations.channel_commitment_id',
        to: 'channel_commitments.id'
      }
    }
  };
  readonly id!: number;
  commitment: LedgerCommitment;
  destination: Address;
  amount: Uint256;
  priority: Uint32;
  assetHolderAddress: Address;
}
