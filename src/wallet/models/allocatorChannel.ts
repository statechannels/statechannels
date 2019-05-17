import { Address, Channel, Uint256, Uint32 } from 'fmg-core';
import { Model, snakeCaseMappers } from 'objection';
import AllocatorChannelParticipant from './allocator_channel_participant';
import LedgerCommitment from './allocatorChannelCommitment';

export default class AllocatorChannel extends Model {
  get asCoreChannel(): Channel {
    return {
      channelType: this.rulesAddress,
      nonce: this.nonce,
      participants: this.participants.map(p => p.address),
    };
  }

  static tableName = 'allocator_channels';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    participants: {
      relation: Model.HasManyRelation,
      modelClass: AllocatorChannelParticipant,
      join: {
        from: 'allocator_channels.id',
        to: 'allocator_channel_participants.allocator_channel_id',
      },
    },
    commitments: {
      relation: Model.HasManyRelation,
      modelClass: LedgerCommitment,
      join: {
        from: 'allocator_channels.id',
        to: 'allocator_channel_commitments.allocator_channel_id',
      },
    },
  };

  readonly id!: number;
  channeId: string;
  holdings!: Uint256;
  nonce: Uint32;
  participants: AllocatorChannelParticipant[];
  commitments: LedgerCommitment[];
  rulesAddress: Address;
}
