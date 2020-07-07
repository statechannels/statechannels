import {State} from '@statechannels/nitro-protocol';
import {Uint32} from '../../types';
import {Model, snakeCaseMappers} from 'objection';
import Channel from './channel';
import Outcome from './outcome';

export default class ChannelState extends Model {
  static get columnNameMappers() {
    return snakeCaseMappers();
  }
  static tableName = 'channel_states';

  static relationMappings = {
    channel: {
      relation: Model.BelongsToOneRelation,
      modelClass: `${__dirname}/channel`,
      join: {
        from: 'channel_states.channel_id',
        to: 'channels.id'
      }
    },
    outcome: {
      relation: Model.HasManyRelation,
      modelClass: Outcome,
      join: {
        from: 'channel_states.id',
        to: 'outcomes.channel_state_id'
      }
    }
  };

  readonly id!: number;
  channel!: Channel;
  channelId!: number;
  turnNum!: Uint32;
  isFinal!: boolean;
  outcome!: Outcome[];
  appData!: any;
  challengeDuration!: number;
  appDefinition!: string;

  asStateObject(): State {
    return {
      channel: this.channel.asChannelObject,
      turnNum: this.turnNum,
      isFinal: this.isFinal,
      outcome: this.outcome.map(outcome => outcome.asOutcomeObject),
      appData: this.appData,
      challengeDuration: this.challengeDuration,
      appDefinition: this.appDefinition
    };
  }
}
