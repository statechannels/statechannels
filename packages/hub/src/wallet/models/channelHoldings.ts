import {Uint256, Address} from '../../types';
import {Model, snakeCaseMappers} from 'objection';

export default class ChannelHolding extends Model {
  static tableName = 'channel_holdings';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  static relationMappings = {
    channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: ChannelHolding,
      join: {
        from: 'channel_holdings.channel_id',
        to: 'channels.id'
      }
    }
  };
  readonly id!: number;
  assetHolderAddress!: Address;
  amount!: Uint256;
}
