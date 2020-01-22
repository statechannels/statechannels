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
} from '../../src/types';
import {calculateChannelId} from '../../src/utils';

export class FakeChannelClient implements ChannelClientInterface<ChannelResult> {
  playerIndex?: number;
  opponentIndex?: number;
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

  updatePlayerIndex(playerIndex: number): void {
    if (this.playerIndex === undefined) {
      this.playerIndex = playerIndex;
      this.opponentIndex = playerIndex == 1 ? 0 : 1;
    }
  }

  verifyTurnNum(turnNum: string): Promise<void> {
    const currentTurnNum = bigNumberify(turnNum);
    if (currentTurnNum.mod(2).eq(this.getPlayerIndex())) {
      return Promise.reject(
        `Not your turn: currentTurnNum = ${currentTurnNum}, index = ${this.playerIndex}`
      );
    }
    return Promise.resolve();
  }

  getPlayerIndex(): number {
    if (this.playerIndex === undefined) {
      throw Error(`This client does not have its player index set yet`);
    }
    return this.playerIndex;
  }

  getOpponentIndex(): number {
    if (this.opponentIndex === undefined) {
      throw Error(`This client does not have its opponent player index set yet`);
    }
    return this.opponentIndex;
  }

  getNextTurnNum(latestState: ChannelResult): string {
    return bigNumberify(latestState.turnNum)
      .add(1)
      .toString();
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
      channelId: calculateChannelId(participants, appDefinition),
      turnNum: bigNumberify(0).toString(),
      status: 'proposed'
    };
    this.updatePlayerIndex(0);
    this.latestState = channel;
    this.opponentAddress = channel.participants[1].participantId;
    this.notifyOpponent(channel, 'createChannel');

    return channel;
  }

  async joinChannel(channelId: string): Promise<ChannelResult> {
    const latestState = this.findChannel(channelId);
    this.updatePlayerIndex(1);
    log.debug(`Player ${this.getPlayerIndex()} joining channel ${channelId}`);
    await this.verifyTurnNum(latestState.turnNum);

    // skip funding by setting the channel to 'running' the moment it is joined
    // [assuming we're working with 2-participant channels for the time being]
    this.latestState = {
      ...latestState,
      turnNum: bigNumberify(3).toString(),
      status: 'running'
    };
    this.opponentAddress = latestState.participants[0].participantId;
    this.notifyOpponent(this.latestState, 'joinChannel');

    return this.latestState;
  }

  async updateChannel(
    channelId: string,
    participants: Participant[],
    allocations: Allocation[],
    appData: string
  ): Promise<ChannelResult> {
    log.debug(`Player ${this.getPlayerIndex()} updating channel ${channelId}`);
    const latestState = this.findChannel(channelId);

    const nextState = {...latestState, participants, allocations, appData};
    if (nextState !== latestState) {
      await this.verifyTurnNum(nextState.turnNum);
      nextState.turnNum = this.getNextTurnNum(latestState);
      nextState.status = 'running';
      log.debug(`Player ${this.getPlayerIndex()} updated channel to turnNum ${nextState.turnNum}`);
    }

    this.latestState = nextState;

    this.notifyOpponent(this.latestState, 'updateChannel');
    return this.latestState;
  }

  async challengeChannel(channelId: string): Promise<ChannelResult> {
    log.debug(`Player ${this.getPlayerIndex()} challenging channel ${channelId}`);
    const latestState = this.findChannel(channelId);
    this.latestState = {...latestState, status: 'challenging'};
    return this.latestState;
  }

  async closeChannel(channelId: string): Promise<ChannelResult> {
    const latestState = this.findChannel(channelId);
    await this.verifyTurnNum(latestState.turnNum);
    const turnNum = this.getNextTurnNum(latestState);
    const status = 'closing';

    this.latestState = {...latestState, turnNum, status};
    log.debug(
      `Player ${this.getPlayerIndex()} updated channel to status ${status} on turnNum ${turnNum}`
    );
    this.notifyOpponent(this.latestState, 'closeChannel');

    return this.latestState;
  }

  protected notifyOpponent(data: ChannelResult, notificationType: string): void {
    log.debug(
      `${this.getPlayerIndex()} notifying opponent ${this.getOpponentIndex()} about ${notificationType}`
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

  onMessageQueued(callback: (message: Message<ChannelResult>) => void): UnsubscribeFunction {
    this.events.on('MessageQueued', message => {
      log.debug(
        `Sending message from ${this.getPlayerIndex()} to ${this.getOpponentIndex()}: ${JSON.stringify(
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
    this.latestState = parameters.data;
    this.notifyApp(this.latestState);
    const turnNum = this.getNextTurnNum(this.latestState);

    switch (parameters.data.status) {
      case 'proposed':
        this.events.emit('ChannelProposed', parameters.data);
        break;
      // auto-close, if we received a close
      case 'closing':
        log.debug(
          `${this.getPlayerIndex()} auto-closing channel on close request from ${this.getOpponentIndex()}`
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
