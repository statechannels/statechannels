import {Address} from '../../types';
import {Model} from 'objection';
import Channel from './channel';

export default class Rule extends Model {
  static tableName = 'rules';
  static idColumn = 'address';

  static relationMappings = {
    channels: {
      relation: Model.HasManyRelation,
      modelClass: Channel,
      join: {
        to: 'channels.rule_id',
        from: 'rules.id'
      }
    }
  };
  readonly id!: string;
  readonly address!: Address;
  readonly name!: string;
}
