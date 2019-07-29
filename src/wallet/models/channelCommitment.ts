import { Address, Bytes, Commitment, CommitmentType, toHex, Uint256, Uint32 } from 'fmg-core';
import { Model, snakeCaseMappers } from 'objection';
import { AppAttrSanitizer } from '../../types';
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
        to: 'channels.id',
      },
    },
    allocations: {
      relation: Model.HasManyRelation,
      modelClass: `${__dirname}/allocation`,
      join: {
        from: 'channel_commitments.id',
        to: 'allocations.channel_commitment_id',
      },
    },
  };

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  readonly id!: number;
  channel!: Channel;
  channelId!: number;
  turnNumber!: Uint32;
  commitmentType!: CommitmentType;
  commitmentCount!: Uint32;
  allocations: Allocation[];
  appAttrs!: any;

  toHex(sanitize: AppAttrSanitizer): Bytes {
    return toHex(this.asCoreCommitment(sanitize));
  }

  asCoreCommitment(sanitize: AppAttrSanitizer): Commitment {
    return {
      commitmentType: this.commitmentType,
      commitmentCount: this.commitmentCount,
      turnNum: this.turnNumber,
      channel: this.channel.asCoreChannel,
      allocation: this.allocations.sort(priority).map(amount),
      destination: this.allocations.sort(priority).map(destination),
      appAttributes: sanitize(this.appAttrs),
    };
  }
}

const priority = (allocation: Allocation): Uint32 => allocation.priority;
const amount = (allocation: Allocation): Uint256 => allocation.amount;
const destination = (allocation: Allocation): Address => allocation.destination;
