import {Channel as ChannelObject} from '@statechannels/nitro-protocol';
import {Bytes32} from '../types';
import {Model, snakeCaseMappers} from 'objection';

export default class Channel extends Model {
  static tableName = 'channels';

  static get columnNameMappers() {
    return snakeCaseMappers();
  }

  get asChannelObject(): ChannelObject {
    return {
      channelNonce: this.channelNonce,
      participants: this.participants.map(p => p.address),
      chainId: this.chainId
    };
  }

  readonly id!: number;
  channelId: Bytes32;
  chainId: Bytes32;
  channelNonce: number;
  participants: any[];
}
