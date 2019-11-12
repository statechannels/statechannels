import {Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import Channel from './channel';
import Outcome from './outcome';

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
    outcome: {
      relation: Model.HasManyRelation,
      modelClass: `${__dirname}/outcome`,
      join: {
        from: 'channel_states.id',
        to: 'outcomes.channel_state_id'
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
  outcome: Outcome[];
  appData!: any;
  challengeDuration: number;
  appDefinition: string;
}
