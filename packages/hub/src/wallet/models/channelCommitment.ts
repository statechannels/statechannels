import {AllocationItem, State} from '@statechannels/nitro-protocol';
import {Address, Uint256, Uint32} from 'fmg-core';
import {Model, snakeCaseMappers} from 'objection';
import {AppAttrSanitizer} from '../../types';
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

  asCoreState(sanitize: AppAttrSanitizer): State {
    const destinations = this.allocations.sort(priority).map(destination);
    const allocations = this.allocations.sort(priority).map(amount);
    const allocationItems: AllocationItem[] = destinations.map((dest, destIndex) => ({
      destination: dest,
      amount: allocations[destIndex]
    }));

    return {
      isFinal: this.isFinal,
      turnNum: this.turnNumber,
      channel: this.channel.asCoreChannel,
      outcome: [{assetHolderAddress: 'dummyEtheAssetHolderAddress', allocation: allocationItems}],
      appData: sanitize(this.appAttrs),
      challengeDuration: this.challengeDuration,
      appDefinition: this.appDefinition
    };
  }
}

const priority = (allocation: Allocation): Uint32 => allocation.priority;
const amount = (allocation: Allocation): Uint256 => allocation.amount;
const destination = (allocation: Allocation): Address => allocation.destination;
