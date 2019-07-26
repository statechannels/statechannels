import { Model } from 'objection';
import { Address } from '../../types';

export default class AllocatorChannelParticipant extends Model {
  static tableName = 'channel_participants';

  static relationMappings = {
    allocator_channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: AllocatorChannelParticipant,
      join: {
        from: 'channel_participants.channel_id',
        to: 'channels.id',
      },
    },
  };
  readonly id!: number;
  address!: Address;
}
