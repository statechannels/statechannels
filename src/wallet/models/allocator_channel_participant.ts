import { Model } from 'objection';
import { Address } from '../../types';

export default class AllocatorChannelParticipant extends Model {
  static tableName = 'allocator_channel_participants';

  static relationMappings = {
    allocator_channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: AllocatorChannelParticipant,
      join: {
        from: 'allocator_channel_participants.allocator_channel_id',
        to: 'allocator_channels.id',
      },
    },
  };
  readonly id!: number;
  address!: Address;
}
