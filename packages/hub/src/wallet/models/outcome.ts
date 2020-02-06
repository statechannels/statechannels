import {
  AssetOutcome,
  GuaranteeAssetOutcome,
  AllocationAssetOutcome
} from '@statechannels/nitro-protocol';
import {Address} from '../../types';
import {Model, snakeCaseMappers} from 'objection';
import AllocationItem from './allocation-item';
import ChannelState from './channelState';

export default class Outcome extends Model {
  static tableName = 'outcomes';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    state: {
      relation: Model.BelongsToOneRelation,
      modelClass: ChannelState,
      join: {
        from: 'outcomes.channel_state_id',
        to: 'channel_states.id'
      }
    },
    allocationItems: {
      relation: Model.HasManyRelation,
      modelClass: AllocationItem,
      join: {
        from: 'outcomes.id',
        to: 'allocation_items.outcome_id'
      }
    }
  };

  readonly id!: number;
  state!: ChannelState;
  assetHolderAddress!: Address;
  allocationItems!: AllocationItem[];
  targetChannelId: string;

  get asOutcomeObject(): AssetOutcome {
    if (this.targetChannelId) {
      const guaranteeAssetOutcome: GuaranteeAssetOutcome = {
        assetHolderAddress: this.assetHolderAddress,
        guarantee: {
          targetChannelId: this.targetChannelId,
          destinations: this.allocationItems.map(allocationItem => allocationItem.destination)
        }
      };
      return guaranteeAssetOutcome;
    } else {
      const allocationAssetOutcome: AllocationAssetOutcome = {
        assetHolderAddress: this.assetHolderAddress,
        allocationItems: this.allocationItems.map(allocationItem => ({
          destination: allocationItem.destination,
          amount: allocationItem.amount
        }))
      };
      return allocationAssetOutcome;
    }
  }
}
