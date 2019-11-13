import {Model} from 'objection';
import {Address} from '../../types';

export default class ChannelParticipant extends Model {
  static tableName = 'channel_participants';

  static relationMappings = {
    channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: ChannelParticipant,
      join: {
        from: 'channel_participants.channel_id',
        to: 'channels.id'
      }
    }
  };
  readonly id!: number;
  address!: Address;
  priority!: number;
}
