import {Address, Uint256, Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import Outcome from './outcome';

export default class Allocation extends Model {
  static tableName = 'allocations';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    outcome: {
      relation: Model.BelongsToOneRelation,
      modelClass: Outcome,
      join: {
        from: 'allocations.outcome_id',
        to: 'outcomes.id'
      }
    }
  };
  readonly id!: number;
  outcome: Outcome;
  destination: Address;
  amount: Uint256;
  priority: Uint32;
}
