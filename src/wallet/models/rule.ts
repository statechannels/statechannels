import { Address } from 'fmg-core';
import { Model } from 'objection';
import AllocatorChannel from './allocatorChannel';

export default class Rule extends Model {
  static tableName = 'rules';
  static idColumn = 'address';

  static relationMappings = {
    channels: {
      relation: Model.HasManyRelation,
      modelClass: AllocatorChannel,
      join: {
        to: 'allocator_channels.rule_id',
        from: 'rules.id',
      },
    },
  };
  readonly id!: string;
  readonly address!: Address;
  readonly name!: string;
}
