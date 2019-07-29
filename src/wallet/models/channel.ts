import { Address, Channel as CoreChannel, Uint256, Uint32 } from 'fmg-core';
import { Model, snakeCaseMappers } from 'objection';
import ChannelParticipant from './channelParticipants';
import LedgerCommitment from './channelCommitment';

export default class Channel extends Model {
  get asCoreChannel(): CoreChannel {
    return {
      channelType: this.rulesAddress,
      nonce: this.nonce,
      participants: this.participants.map(p => p.address),
    };
  }

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
        to: 'channel_participants.channel_id',
      },
    },
    commitments: {
      relation: Model.HasManyRelation,
      modelClass: LedgerCommitment,
      join: {
        from: 'channels.id',
        to: 'channel_commitments.channel_id',
      },
    },
  };

  readonly id!: number;
  channelId: string;
  holdings!: Uint256;
  nonce: Uint32;
  participants: ChannelParticipant[];
  commitments: LedgerCommitment[];
  rulesAddress: Address;
  guaranteedChannel: string;
}
