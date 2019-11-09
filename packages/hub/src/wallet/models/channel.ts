import {Uint256} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import ChannelParticipant from './channelParticipants';
import ChannelState from './channelState';

export default class Channel extends Model {
  static tableName = 'channels';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    participants: {
      relation: Model.HasManyRelation,
      modelClass: ChannelParticipant,
      join: {
        from: 'channels.id',
        to: 'channel_participants.channel_id'
      }
    },
    states: {
      relation: Model.HasManyRelation,
      modelClass: ChannelState,
      join: {
        from: 'channels.id',
        to: 'channel_states.channel_id'
      }
    }
  };

  readonly id!: number;
  channelId: string;
  chainId: Uint256;
  holdings!: Uint256;
  channelNonce: Uint256;
  participants: ChannelParticipant[];
  states: ChannelState[];
  guaranteedChannel: string;
}
