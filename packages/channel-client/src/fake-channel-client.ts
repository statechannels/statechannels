import {Wallet} from 'ethers';
import {bigNumberify} from 'ethers/utils';
import EventEmitter = require('eventemitter3');

import {
  ChannelClientInterface,
  Message,
  UnsubscribeFunction,
  ChannelResult,
  EventsWithArgs,
  Participant,
  Allocation,
  PushMessageResult
} from './types';

export const CHANNEL_ID = '0x1234';

export class FakeChannelClient implements ChannelClientInterface<ChannelResult> {
  playerIndex: 0 | 1;
  protected events = new EventEmitter<EventsWithArgs>();
  protected latestState?: ChannelResult;
  protected address: string;
  protected opponentAddress?: string;

  constructor() {
    this.playerIndex = 0;
    this.address = Wallet.createRandom().address;
  }

  setState(state: ChannelResult): void {
    this.latestState = state;
  }

  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    this.events.on('MessageQueued', message => {
      callback(message);
    });
    return () => this.events.removeListener('MessageQueued', callback);
  }

  onChannelUpdated(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.events.on('ChannelUpdated', result => {
      callback(result);
    });
    return () => this.events.removeListener('ChannelUpdated', callback);
  }

  onChannelProposed(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.events.on('ChannelProposed', result => {
      callback(result);
    });
    return () => this.events.removeListener('ChannelProposed', callback);
  }

  async createChannel(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    this.playerIndex = 0;
    const channel: ChannelResult = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId: CHANNEL_ID,
      turnNum: bigNumberify(0).toString(),
      status: 'proposed'
    };

    this.latestState = channel;
    this.opponentAddress = channel.participants[1].participantId;
    this.notifyOpponent(channel);

    return channel;
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    this.playerIndex = 1;
    const latestState = this.findChannel(channelId);
    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {
      ...latestState,
      turnNum: bigNumberify(3).toString(),
      status: 'running'
    };
    this.opponentAddress = this.latestState.participants[0].participantId;
    this.notifyOpponent(this.latestState);

    return this.latestState;
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ): Promise<ChannelResult> {
    const latestState = this.findChannel(channelId);
    const currentTurnNum = bigNumberify(latestState.turnNum);

    const nextState = {...latestState, participants, allocations, appData};
    if (nextState !== latestState) {
      if (currentTurnNum.mod(2).eq(this.playerIndex)) {
        return Promise.reject(
          `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
        );
      }
      nextState.turnNum = currentTurnNum.add(1).toString();
      console.log(this.playerIndex + '  updated channel to turnNum:' + nextState.turnNum);
    }

    this.latestState = nextState;

    this.notifyOpponent(this.latestState);
    return this.latestState;
  }

  async pushMessage(parameters: Message<ChannelResult>): Promise<PushMessageResult> {
    this.latestState = parameters.data;
    this.notifyApp(this.latestState);

    // auto-close, if we received a close
    if (parameters.data.status === 'closing') {
      const turnNum = bigNumberify(this.latestState.turnNum)
        .add(1)
        .toString();
      this.latestState = {...this.latestState, turnNum, status: 'closed'};
      this.notifyOpponent(this.latestState);
      this.notifyApp(this.latestState);
    }

    return {success: true};
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    const latestState = this.findChannel(channelId);
    const currentTurnNum = bigNumberify(latestState.turnNum);

    if (currentTurnNum.mod(2).eq(this.playerIndex)) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
      );
    }

    const turnNum = currentTurnNum.add(1).toString();
    console.log(this.playerIndex + '  updated channel to turnNum:' + turnNum);

    this.latestState = {...latestState, turnNum, status: 'closing'};
    this.notifyOpponent(this.latestState);

    return this.latestState;
  }

  protected notifyOpponent(data: ChannelResult): void {
    const sender = this.address;
    const recipient = this.opponentAddress;

    if (!recipient) {
      throw Error(`Cannot notify opponent - opponent address not set`);
    }
    this.events.emit('MessageQueued', {sender, recipient, data});
  }

  protected notifyApp(data: ChannelResult): void {
    this.events.emit('ChannelUpdated', data);
  }

  protected findChannel(channelId: string): ChannelResult {
    if (!(this.latestState && this.latestState.channelId === channelId)) {
      throw Error(`Channel does't exist with channelId '${channelId}'`);
    }
    return this.latestState;
  }
}
