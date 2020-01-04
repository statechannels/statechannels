import {ChannelProviderInterface} from '@statechannels/channel-provider/src';
import log = require('loglevel');
import {bigNumberify} from 'ethers/utils';
import {EventEmitter, ListenerFn} from 'eventemitter3';
import {ChannelResult, CreateChannelParameters, NotificationType} from '../../src/types';
import {calculateChannelId} from 'utils';

export class FakeChannelProvider implements ChannelProviderInterface {
  private events = new EventEmitter();
  protected url = '';

  playerIndex = 0 | 1;
  opponentIndex = 0 | 1;
  address?: string;
  opponentAddress?: string;
  latestState?: ChannelResult;

  async enable(url?: string): Promise<void> {
    this.url = url || '';
  }

  send<ResultType = any>(method: string, params?: any): Promise<any> {
    switch (method) {
      case 'CreateChannel':
        if (this.events.listenerCount('ChannelProposed') === 0) {
          return Promise.reject(`No callback available for proposing a channel`);
        }
        return this.createChannel(params);

      case 'PushMessage':
        if (this.events.listenerCount('MessageQueued') === 0) {
          return Promise.reject(`No callback available for sending the message`);
        }
        this.events.emit('MessageQueued', params);
        break;

      case 'JoinChannel':
      case 'UpdateChannel':
      case 'CloseChannel':
        if (this.events.listenerCount('ChannelUpdated') === 0) {
          return Promise.reject(`No callback available for ${method}`);
        }
        this.events.emit('ChannelUpdated', params);
        break;

      default:
        return Promise.reject(`No callback available for ${method}`);
    }

    const result: any = {};
    return Promise.resolve(result);
  }

  on(event: string, callback: ListenerFn): void {
    this.events.on(event, callback);
  }

  off(event: string, callback?: ListenerFn): void {
    this.events.off(event);
  }

  subscribe(subscriptionType: string): Promise<string> {
    return Promise.resolve('success');
  }
  unsubscribe(subscriptionId: string): Promise<boolean> {
    return Promise.resolve(true);
  }

  private updatePlayerIndex(playerIndex: number): void {
    this.playerIndex = playerIndex;
    this.opponentIndex = playerIndex == 1 ? 0 : 1;
  }

  private async createChannel(params: CreateChannelParameters): Promise<ChannelResult> {
    const participants = params.participants;
    const allocations = params.allocations;
    const appDefinition = params.appDefinition;
    const appData = params.appData;

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
    this.address = channel.participants[0].participantId;
    this.opponentAddress = channel.participants[1].participantId;
    this.notifyOpponent(channel, 'ChannelProposed');

    return channel;
  }

  private notifyOpponent(data: ChannelResult, notificationType: NotificationType): void {
    log.debug(
      `${this.playerIndex} notifying opponent ${this.opponentIndex} about ${notificationType}`
    );
    const sender = this.address;
    const recipient = this.opponentAddress;

    if (!recipient) {
      throw Error(`Cannot notify opponent - opponent address not set`);
    }

    this.events.emit(notificationType, {sender, recipient, data});
  }
}
