import {Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import Allocation from './allocation';
import Channel from './channel';

export default class ChannelCommitment extends Model {
  static tableName = 'channel_commitments';

  static relationMappings = {
    channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${__dirname}/channel`,
      join: {
        from: 'channel_commitments.channel_id',
        to: 'channels.id'
      }
    },
    allocations: {
      relation: Model.HasManyRelation,
      modelClass: `${__dirname}/allocation`,
      join: {
        from: 'channel_commitments.id',
        to: 'allocations.channel_commitment_id'
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
  commitmentCount!: Uint32;
  allocations: Allocation[];
  appAttrs!: any;
  challengeDuration: number;
  appDefinition: string;
}
