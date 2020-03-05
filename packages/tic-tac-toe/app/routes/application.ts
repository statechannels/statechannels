import Route from '@ember/routing/route';
import Transition from '@ember/routing/-private/transition';
import {inject as service} from '@ember/service';
import {ChannelClient} from '@statechannels/channel-client';

import {ChannelProviderInterface} from '@statechannels/channel-provider';
import TttChannelClientService from '../services/ttt-channel-client';

declare global {
  interface Window {
    channelProvider: ChannelProviderInterface;
  }
}

export default class ApplicationRoute extends Route {
  @service tttChannelClient!: TttChannelClientService;

  async beforeModel(transition: Transition): Promise<void> {
    super.beforeModel(transition);
    window.channelProvider.enable('http://localhost:3055/');
    this.tttChannelClient.enable(new ChannelClient(window.channelProvider));
  }
}
