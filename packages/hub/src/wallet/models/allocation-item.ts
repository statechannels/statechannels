import {Bytes32} from '@statechannels/nitro-protocol';
import {Uint256, Uint32} from '../../types';
import {Model, snakeCaseMappers} from 'objection';
import Outcome from './outcome';

export default class AllocationItem extends Model {
  static tableName = 'allocation_items';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    outcome: {
      relation: Model.BelongsToOneRelation,
      modelClass: Outcome,
      join: {
        from: 'allocation_items.outcome_id',
        to: 'outcomes.id'
      }
    }
  };
  readonly id!: number;
  destination!: Bytes32;
  amount: Uint256;
  priority!: Uint32;
}
