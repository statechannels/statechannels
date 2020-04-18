import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import MessageModel from '../models/message';
import TttChannelClientService from '../services/ttt-channel-client';
import UserService from '../services/user';
import {Message} from '@statechannels/client-api-schema';

export default class GamesController extends Controller {
  @service tttChannelClient!: TttChannelClientService;
  @service user!: UserService;

  @action
  onMessage(message: MessageModel): void {
    if (message.recipient !== this.user.address) {
      return;
    }
    console.log('GOT FROM FIREBASE: ' + JSON.stringify(message));
    const clientMessage: Message = {
      recipient: message.recipient,
      sender: message.sender,
      data: message.data
    };
    this.tttChannelClient.pushMessage(clientMessage);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    games: GamesController;
  }
}
