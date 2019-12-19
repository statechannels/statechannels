import {bigNumberify} from 'ethers/utils';
import EventEmitter = require('eventemitter3');
import log = require('loglevel');

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
import {calculateChannelId} from './utils';

export class FakeChannelClient implements ChannelClientInterface<ChannelResult> {
  playerIndex = 0 | 1;
  opponentIndex = 0 | 1;
  opponentAddress?: string;
  latestState?: ChannelResult;
  protected events = new EventEmitter<EventsWithArgs>();

  constructor(public readonly address: string) {}

  async getAddress(): Promise<string> {
    return this.address;
  }

  setState(state: ChannelResult): void {
    this.latestState = state;
  }

  updatePlayerIndex(playerIndex: number) {
    this.playerIndex = playerIndex;
    this.opponentIndex = playerIndex == 1 ? 0 : 1;
  }

  async createChannel(
    participants: Participant[],
    allocations: Allocation[],
    appDefinition: string,
    appData: string
  ): Promise<ChannelResult> {
    const channel: ChannelResult = {
      participants,
      allocations,
      appDefinition,
      appData,
      channelId: calculateChannelId(participants, allocations, appDefinition, appData),
      turnNum: bigNumberify(0).toString(),
      status: 'proposed'
    };

    this.latestState = channel;
    this.opponentAddress = channel.participants[1].participantId;
    this.notifyOpponent(channel, 'createChannel');

    return channel;
  }

  verifyTurnNum(): Promise<void> {
    const currentTurnNum = bigNumberify(this.latestState!.turnNum);
    if (currentTurnNum.mod(2).eq(this.playerIndex)) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
      );
    }
    return Promise.resolve();
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    await this.verifyTurnNum();

    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {
      ...this.latestState!,
      turnNum: bigNumberify(3).toString(),
      status: 'running'
    };
    this.opponentAddress = this.latestState.participants[0].participantId;
    this.notifyOpponent(this.latestState, 'joinChannel');

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
      await this.verifyTurnNum();
      nextState.turnNum = currentTurnNum.add(1).toString();
      log.debug(`Player ${this.playerIndex} updated channel to turnNum ${nextState.turnNum}`);
    }

    this.latestState = nextState;

    this.notifyOpponent(this.latestState, 'updateChannel');
    return this.latestState;
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    await this.verifyTurnNum();
    const turnNum = this.getNextTurnNum();
    const status = 'closing';

    this.latestState = {...this.latestState!, turnNum, status};
    log.debug(
      `Player ${this.playerIndex} updated channel to status ${status} on turnNum ${turnNum}`
    );
    this.notifyOpponent(this.latestState, 'closeChannel');

    return this.latestState;
  }

  protected notifyOpponent(data: ChannelResult, notificationType: string): void {
    log.debug(
      `${this.playerIndex} notifying opponent ${this.opponentIndex} about ${notificationType}`
    );
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

  getNextTurnNum() {
    if (!this.latestState) {
      throw Error(`Latest state for channel not set, cannot get next turn number`);
    }

    return bigNumberify(this.latestState.turnNum)
      .add(1)
      .toString();
  }

  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    this.events.on('MessageQueued', message => {
      log.debug(
        `Sending message from ${this.playerIndex} to ${this.opponentIndex}: ${JSON.stringify(
          message,
          undefined,
          4
        )}`
      );
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

  async pushMessage(parameters: Message<ChannelResult>): Promise<PushMessageResult> {
    log.debug(
      `${this.playerIndex} pushing message from app to wallet: ${JSON.stringify(
        parameters,
        undefined,
        4
      )}`
    );
    this.latestState = parameters.data;
    this.notifyApp(this.latestState);
    const turnNum = this.getNextTurnNum();

    switch (parameters.data.status) {
      case 'proposed':
        this.events.emit('ChannelProposed', parameters.data);
        break;
      // auto-close, if we received a close
      case 'closing':
        log.debug(
          `${this.playerIndex} auto-closing channel on close request from ${this.opponentIndex}`
        );
        this.latestState = {...this.latestState, turnNum, status: 'closed'};
        this.notifyOpponent(this.latestState, 'pushMessage');
        this.notifyApp(this.latestState);
        break;
      default:
        break;
    }

    return {success: true};
  }
}
