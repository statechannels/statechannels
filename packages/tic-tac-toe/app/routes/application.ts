import Route from '@ember/routing/route';
import Transition from '@ember/routing/-private/transition';
import {inject as service} from '@ember/service';
import {ChannelClient} from '@statechannels/channel-client';
import {ChannelProviderInterface} from '@statechannels/channel-provider';
import TttChannelClientService from '../services/ttt-channel-client';
import ENV from '@statechannels/tic-tac-toe/config/environment';
import {Message} from '@statechannels/client-api-schema';
import MessageModel from '../models/message';
import {ChannelState} from '../core/channel-state';
import {AppData} from '../core/app-data';

const {WALLET_URL} = ENV;

declare global {
  interface Window {
    channelProvider: ChannelProviderInterface;
  }
}

function sanitizeMessageForFirebase(message: MessageModel): MessageModel {
  return JSON.parse(JSON.stringify(message));
}

export default class ApplicationRoute extends Route {
  @service tttChannelClient!: TttChannelClientService;

  beforeModel(transition: Transition): void {
    super.beforeModel(transition);

    window.channelProvider.mountWalletComponent(WALLET_URL);

    this.tttChannelClient.enable(new ChannelClient(window.channelProvider));

    this.tttChannelClient.onMessageQueued((message: Message) => {
      const messageData = {
        recipient: message.recipient,
        sender: message.sender,
        data: message.data
      } as MessageModel;

      const newMessage = this.store.createRecord(
        'message',
        sanitizeMessageForFirebase(messageData)
      );
      newMessage.save();
    });

    this.tttChannelClient.onChannelUpdated((channelState: ChannelState<AppData>) => {
      console.log(channelState);
    });
  }
}
