import {
  AssetOutcome,
  GuaranteeAssetOutcome,
  AllocationAssetOutcome
} from '@statechannels/nitro-protocol';
import {Address} from '../../types';
import {Model, snakeCaseMappers} from 'objection';
import Allocation from './allocation';
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
    allocation: {
      relation: Model.HasManyRelation,
      modelClass: Allocation,
      join: {
        from: 'outcomes.id',
        to: 'allocations.outcome_id'
      }
    }
  };

  readonly id!: number;
  state!: ChannelState;
  assetHolderAddress!: Address;
  allocation!: Allocation[];
  targetChannelId: string;

  get asOutcomeObject(): AssetOutcome {
    if (this.targetChannelId) {
      const guaranteeAssetOutcome: GuaranteeAssetOutcome = {
        assetHolderAddress: this.assetHolderAddress,
        guarantee: {
          targetChannelId: this.targetChannelId,
          destinations: this.allocation.map(allocation => allocation.destination)
        }
      };
      return guaranteeAssetOutcome;
    } else {
      const allocationAssetOutcome: AllocationAssetOutcome = {
        assetHolderAddress: this.assetHolderAddress,
        allocation: this.allocation.map(allocation => ({
          destination: allocation.destination,
          amount: allocation.amount
        }))
      };
      return allocationAssetOutcome;
    }
  }
}
