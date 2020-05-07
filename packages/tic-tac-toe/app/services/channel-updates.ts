import Service from '@ember/service';
import {inject as service} from '@ember/service';
import TttChannelClientService from './ttt-channel-client';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';
import * as ChannelState from '../core/channel-state';
import {AppData} from '../core/app-data';

export default class ChannelUpdatesService extends Service {
  @service tttChannelClient!: TttChannelClientService;

  @tracked subscriptions: {id: number; callback: Function}[] = [];

  public setup(): void {
    this.tttChannelClient.onChannelUpdated((channelState: ChannelState.ChannelState<AppData>) => {
      this.subscriptions.map(subscription => subscription.callback(channelState));
      console.log('ChannelState Received from onChannelUpdated:', channelState);
    });
  }

  @action
  public subscribeToMessages(id: number, callback: Function): void {
    this.subscriptions.push({id, callback});
  }

  @action
  public unsubscribeFromMessages(id: number): void {
    this.subscriptions = this.subscriptions.filter(subscription => subscription.id !== id);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'channel-updates': ChannelUpdatesService;
  }
}
