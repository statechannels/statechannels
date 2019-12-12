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
import {sleep} from './utils';

const FAKE_DELAY = 100; // ms

export class FakeChannelClient implements ChannelClientInterface<ChannelResult> {
  playerIndex: 0 | 1;
  protected events = new EventEmitter<EventsWithArgs>();
  protected latestState?: ChannelResult;
  protected address: string;
  protected opponentAddress: string;

  constructor(opponentAddress: string) {
    this.playerIndex = 0;
    this.address = Wallet.createRandom().address;
    this.opponentAddress = opponentAddress;
  }

  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    this.events.on('MessageQueued', message => {
      callback(message);
    });
    return () => this.events.removeListener('MessageQueued', callback); // eslint-disable-line  @typescript-eslint/explicit-function-return-type
  }

  onChannelUpdated(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.events.on('ChannelUpdated', result => {
      callback(result);
    });
    return () => this.events.removeListener('ChannelUpdated', callback); // eslint-disable-line  @typescript-eslint/explicit-function-return-type
  }

  onChannelProposed(callback: (result: ChannelResult) => void): UnsubscribeFunction {
    this.events.on('ChannelProposed', result => {
      callback(result);
    });
    return () => this.events.removeListener('ChannelProposed', callback); // eslint-disable-line  @typescript-eslint/explicit-function-return-type
  }

  async createChannel(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    this.playerIndex = 0;
    this.latestState = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId: '0xabc234',
      turnNum: bigNumberify(0).toString(),
      status: 'proposed'
    };
    this.opponentAddress = this.latestState.participants[1].participantId;
    // [assuming we're working with 2-participant channels for the time being]
    await sleep(FAKE_DELAY);
    this.notifyOpponent(this.latestState);

    return this.latestState;
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    this.playerIndex = 1;
    const latestState = this.findChannel(channelId);
    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {...latestState, turnNum: bigNumberify(3).toString(), status: 'running'};
    this.opponentAddress = this.latestState.participants[0].participantId;
    await sleep(FAKE_DELAY);
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
