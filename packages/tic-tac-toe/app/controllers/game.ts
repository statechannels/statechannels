import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import CurrentGameService, {Player} from '../services/current-game';
import TttChannelClientService from '../services/ttt-channel-client';
import * as ChannelState from '../core/channel-state';
import UserService from '../services/user';
import {AppData} from '../core/app-data';
import MessageModel from '../models/message';
import {Message} from '@statechannels/client-api-schema';
import ChannelUpdatesService from '../services/channel-updates';

export default class GameController extends Controller {
  @service currentGame!: CurrentGameService;
  @service tttChannelClient!: TttChannelClientService;
  @service user!: UserService;
  @service channelUpdates!: ChannelUpdatesService;

  @tracked Xs = 0b000000000;
  @tracked Os = 0b000000000;
  @tracked player = 'x';

  get isItMyTurn(): boolean {
    return (
      (this.player === 'x' && this.currentGame.getPlayer() === Player.A) ||
      (this.player === 'o' && this.currentGame.getPlayer() === Player.B)
    );
  }

  get board(): {
    class: string;
    status: string;
  }[] {
    const arr = [];
    for (let i = 0; i < 9; i++) {
      const status = (1 << i) & this.Xs ? 'x' : (1 << i) & this.Os ? 'o' : '';
      const obj = {
        class: 'flex justify-center items-center',
        status
      };
      arr.push(obj);
    }
    arr[1].class += ' border-l-2 border-r-2 border-line';
    arr[3].class += ' border-t-2 border-b-2 border-line';
    arr[4].class += ' border-2 border-line';
    arr[5].class += ' border-t-2 border-b-2 border-line';
    arr[7].class += ' border-l-2 border-r-2 border-line';
    return arr;
  }

  @action
  protected async initGame(): Promise<void> {
    if (this.currentGame.getPlayer() === Player.B) {
      console.log('Starting game as Player B. Waiting for Player A to play.');
    } else {
      console.log('Starting game as Player A. My turn. Need to play');
    }

    const updatesId = Date.now();
    this.channelUpdates.subscribeToMessages(
      updatesId,
      (channelState: ChannelState.ChannelState<AppData>) => {
        if (this.currentGame.getPlayer() === Player.B) {
          if (ChannelState.isRunning(channelState)) {
            if (ChannelState.inXPlaying(channelState)) {
              this.player = 'o';
              this.Xs = channelState.appData.Xs;
              this.Os = channelState.appData.Os;
              console.log('Moving from xPlaying -> oPlaying');
            }
            if (ChannelState.inOPlaying(channelState)) {
              this.player = 'x';
              this.Xs = channelState.appData.Xs;
              this.Os = channelState.appData.Os;
              console.log('Moving from oPlaying -> xPlaying');
            }
          }
        } else {
          if (ChannelState.isRunning(channelState)) {
            if (ChannelState.inXPlaying(channelState)) {
              this.player = 'o';
              this.Xs = channelState.appData.Xs;
              this.Os = channelState.appData.Os;
              console.log('Moving from xPlaying -> oPlaying');
            }
            if (ChannelState.inOPlaying(channelState)) {
              this.player = 'x';
              this.Xs = channelState.appData.Xs;
              this.Os = channelState.appData.Os;
              console.log('Moving from oPlaying -> xPlaying');
            }
          }
        }
      }
    );
  }

  @action
  protected setTile(index: number): void {
    if ((1 << index) & this.Xs || (1 << index) & this.Os || !this.isItMyTurn) {
      return;
    }

    if (this.player == 'x') {
      this.Xs |= 1 << index;
      const currentChannelState = this.currentGame.getChannelState();
      const xPlayingState: AppData = {
        type: 'xPlaying',
        stake: this.currentGame.getGame().stake,
        Xs: this.Xs,
        Os: this.Os
      };

      this.tttChannelClient.updateChannel(
        currentChannelState.channelId,
        currentChannelState.aAddress,
        currentChannelState.bAddress,
        currentChannelState.aBal,
        currentChannelState.bBal,
        xPlayingState,
        currentChannelState.aOutcomeAddress,
        currentChannelState.bOutcomeAddress
      );
      console.log('Setting X on board');
    } else {
      this.Os |= 1 << index;
      const currentChannelState = this.currentGame.getChannelState();
      const oPlayingState: AppData = {
        type: 'oPlaying',
        stake: this.currentGame.getGame().stake,
        Xs: this.Xs,
        Os: this.Os
      };

      this.tttChannelClient.updateChannel(
        currentChannelState.channelId,
        currentChannelState.aAddress,
        currentChannelState.bAddress,
        currentChannelState.aBal,
        currentChannelState.bBal,
        oPlayingState,
        currentChannelState.aOutcomeAddress,
        currentChannelState.bOutcomeAddress
      );
      console.log('Setting O on board');
    }
  }

  @action
  onMessage(message: MessageModel): void {
    if (message.recipient !== this.user.address) {
      console.log('onMessage not for me.');
      console.log('Recipient ', message.recipient);
      console.log('My address ', this.user.address);
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
    game: GameController;
  }
}
