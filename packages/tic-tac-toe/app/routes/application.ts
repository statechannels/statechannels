import Route from '@ember/routing/route';
import Transition from '@ember/routing/-private/transition';
import {inject as service} from '@ember/service';
import {ChannelClient} from '@statechannels/channel-client';
import {ChannelProviderInterface} from '@statechannels/channel-provider';
import TttChannelClientService from '../services/ttt-channel-client';
import ENV from '@statechannels/tic-tac-toe/config/environment';
import {Message} from '@statechannels/client-api-schema';
import MessageModel from '../models/message';
import * as ChannelState from '../core/channel-state';
import {AppData} from '../core/app-data';
import CurrentGameService, {Player} from '../services/current-game';
import ChannelUpdatesService from '../services/channel-updates';

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
  @service currentGame!: CurrentGameService;
  @service channelUpdates!: ChannelUpdatesService;

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

    this.channelUpdates.setup();

    const updatesId = Date.now();
    this.channelUpdates.subscribeToMessages(
      updatesId,
      (channelState: ChannelState.ChannelState<AppData>) => {
        console.log('OnChannelUpdate from application');
        if (this.currentGame.getPlayer() === Player.B) {
          if (ChannelState.inChannelProposed(channelState)) {
            this.currentGame.setChannelState(channelState);
            this.tttChannelClient.joinChannel(channelState.channelId);
            console.log('Joining game as Player B');
          } else if (ChannelState.isRunning(channelState)) {
            if (ChannelState.inStart(channelState)) {
              this.currentGame.setChannelState(channelState);
              this.channelUpdates.unsubscribeFromMessages(updatesId);
              this.transitionTo('game');
            }
          }
        } else {
          if (ChannelState.isRunning(channelState)) {
            if (ChannelState.inStart(channelState)) {
              this.currentGame.setChannelState(channelState);
              this.channelUpdates.unsubscribeFromMessages(updatesId);
              this.transitionTo('game');
            }
          }
        }
      }
    );
  }
}
