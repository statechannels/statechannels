import {Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import Allocation from './allocation';
import Channel from './channel';

export default class ChannelState extends Model {
  static tableName = 'channel_states';

  static relationMappings = {
    channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${__dirname}/channel`,
      join: {
        from: 'channel_states.channel_id',
        to: 'channels.id'
      }
    },
    allocations: {
      relation: Model.HasManyRelation,
      modelClass: `${__dirname}/allocation`,
      join: {
        from: 'channel_states.id',
        to: 'allocations.channel_state_id'
      }
    }
  };

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  readonly id!: number;
  channel!: Channel;
  channelId!: number;
  turnNumber!: Uint32;
  isFinal!: boolean;
  allocations: Allocation[];
  appAttrs!: any;
  challengeDuration: number;
  appDefinition: string;
}
