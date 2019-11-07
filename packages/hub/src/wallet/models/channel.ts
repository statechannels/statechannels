import {Uint256} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import LedgerCommitment from './channelCommitment';
import ChannelParticipant from './channelParticipants';

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
    commitments: {
      relation: Model.HasManyRelation,
      modelClass: LedgerCommitment,
      join: {
        from: 'channels.id',
        to: 'channel_commitments.channel_id'
      }
    }
  };

  readonly id!: number;
  channelId: string;
  chainId: Uint256;
  holdings!: Uint256;
  channelNonce: Uint256;
  participants: ChannelParticipant[];
  commitments: LedgerCommitment[];
  guaranteedChannel: string;
}
