import {Channel as ChannelObject} from '@statechannels/nitro-protocol';
import {Uint256} from '../../types';
import {Model, snakeCaseMappers} from 'objection';
import ChannelHolding from './channelHoldings';
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
    },
    holdings: {
      relation: Model.HasManyRelation,
      modelClass: ChannelHolding,
      join: {
        from: 'channels.id',
        to: 'channel_holdings.channel_id'
      }
    }
  };

  get asChannelObject(): ChannelObject {
    return {
      channelNonce: this.channelNonce,
      participants: this.participants.map(p => p.address),
      chainId: this.chainId
    };
  }

  readonly id!: number;
  channelId: string;
  chainId: Uint256;
  channelNonce: Uint256;
  participants: ChannelParticipant[];
  states: ChannelState[];
  holdings: ChannelHolding[];
}
