import {AllocationAssetOutcome} from '@statechannels/nitro-protocol/lib/src/contract/outcome';
import {
  AssetOutcome,
  GuaranteeAssetOutcome
} from '@statechannels/nitro-protocol/src/contract/outcome';
import {Address} from 'fmg-core';
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
      modelClass: `${__dirname}/allocation`,
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
  tagetChannelId: string;

  get asOutcomeObject(): AssetOutcome {
    if (this.tagetChannelId) {
      const guaranteeAssetOutcome: GuaranteeAssetOutcome = {
        assetHolderAddress: this.assetHolderAddress,
        guarantee: {
          targetChannelId: this.tagetChannelId,
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
