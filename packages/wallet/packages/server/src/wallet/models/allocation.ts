import { Address, Uint256, Uint32 } from 'fmg-core';
import { Model } from 'objection';
import LedgerCommitment from './allocatorChannelCommitment';

export default class Allocation extends Model {
  static tableName = 'allocations';

  static relationMappings = {
    commitment: {
      relation: Model.BelongsToOneRelation,
      modelClass: LedgerCommitment,
      join: {
        from: 'allocations.allocator_channel_commitment_id',
        to: 'allocator_channel_commitments.id',
      },
    },
  };
  readonly id!: number;
  commitment: LedgerCommitment;
  destination: Address;
  amount: Uint256;
  priority: Uint32;
}
