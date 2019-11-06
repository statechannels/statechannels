import {BigNumberish} from 'ethers/utils';
import EventEmitter from 'eventemitter3';
import {GameState} from '../redux/game/state';

export enum ChannelState {
  Proposed = 'proposed',
  Open = 'open',
}

export type MessageParameters = OpenChannelParameters | JoinChannelParameters;

export interface OpenChannelParameters {
  participants: string[];
  balances: BigNumberish[];
  appData: GameState;
  state: 'proposed';
}

export interface JoinChannelParameters {
  participants: string[];
  channelId: string[];
  state: 'open';
}

export class ChannelClient {
  protected events: EventEmitter = new EventEmitter();

  constructor() {
    this.events.on('channelUpdated', (payload: MessageParameters) => {
      this.sendMessage('chan_update', payload);
    });
  }

  async openChannel(parameters: OpenChannelParameters) {
    this.events.emit('channelUpdated', {...parameters, state: ChannelState.Proposed});
  }

  async messageReceived(method: string) {
    this.events.emit(method);
  }

  async joinChannel(parameters: JoinChannelParameters) {
    this.events.emit('channelUpdated', {...parameters, state: ChannelState.Open});
  }

  async updateState(parameters: MessageParameters) {
    this.events.emit('channelUpdated', {...parameters, state: ChannelState.Open});
  }

  protected async sendMessage(method: string, parameters: MessageParameters) {
    // TODO: What goes here?
  }
}
