import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import CurrentGameService, {Player} from '../services/current-game';
import TttChannelClientService from '../services/ttt-channel-client';
import * as ChannelState from '../core/channel-state';
import UserService from '../services/user';
import {AppData, StateUpdateType} from '../core/app-data';
import MessageModel from '../models/message';
import {Message} from '@statechannels/client-api-schema';
import ChannelUpdatesService from '../services/channel-updates';

const {bigNumberify} = ethers.utils;

const TOP_ROW = 448; /*  0b111000000 = 448 mask for win @ row 1 */
const MID_ROW = 56; /*  0b000111000 =  56 mask for win @ row 2 */
const BOT_ROW = 7; /*  0b000000111 =   7 mask for win @ row 3 */
const LEFT_COL = 292; /*  0b100100100 = 292 mask for win @ col 1 */
const MID_COL = 146; /*  0b010010010 = 146 mask for win @ col 2 */
const RIGHT_COL = 73; /*  0b001001001 =  73 mask for win @ col 3 */
const DH_DIAG = 273; /*  0b100010001 = 273 mask for win @ downhill diag */
const UH_DIAG = 84; /*  0b001010100 =  84 mask for win @ uphill diag */
const FULL_BOARD = 511; /*  0b111111111 = 511 full board */

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
        this.currentGame.setChannelState(channelState);
        if (ChannelState.isRunning(channelState)) {
          if (ChannelState.inXPlaying(channelState)) {
            this.updateBoard('o', channelState.appData.Xs, channelState.appData.Os);
            console.log('Moving from xPlaying -> oPlaying');
          }
          if (ChannelState.inOPlaying(channelState)) {
            this.updateBoard('x', channelState.appData.Xs, channelState.appData.Os);
            console.log('Moving from oPlaying -> xPlaying');
          }
          if (ChannelState.inVictory(channelState)) {
            console.log('Someone won');
            this.closeChannel();
            this.transitionToRoute('games');
          }
          if (ChannelState.inDraw(channelState)) {
            console.log('Its a draw');
            this.closeChannel();
            this.transitionToRoute('games');
          }
          if (ChannelState.inStart(channelState)) {
            console.log('Restart game');
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

    let moveType: StateUpdateType;

    if (this.player == 'x') {
      this.Xs |= 1 << index;
      moveType = this.isWinningMove(this.Xs)
        ? 'victory'
        : this.isDraw(this.Xs, this.Os)
        ? 'draw'
        : 'xPlaying';
      this.setTileInChannel(moveType);
      console.log('Setting X on board');
    } else {
      this.Os |= 1 << index;
      moveType = this.isWinningMove(this.Os)
        ? 'victory'
        : this.isDraw(this.Xs, this.Os)
        ? 'draw'
        : 'oPlaying';
      this.setTileInChannel(moveType);
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

  private async setTileInChannel(type: StateUpdateType): Promise<void> {
    const currentChannelState = this.currentGame.getChannelState();
    const appAttrs: AppData = {
      type,
      stake: this.currentGame.getGame().stake,
      Xs: this.Xs,
      Os: this.Os
    };
    if (type === 'victory') {
      const aBal = bigNumberify(currentChannelState.aBal);
      const bBal = bigNumberify(currentChannelState.bBal);
      const stake = bigNumberify(this.currentGame.getGame().stake);
      if (this.currentGame.getPlayer() === Player.A) {
        currentChannelState.aBal = aBal.add(stake).toString();
        currentChannelState.bBal = bBal.sub(stake).toString();
      } else {
        currentChannelState.aBal = aBal.sub(stake).toString();
        currentChannelState.bBal = bBal.add(stake).toString();
      }
    }
    await this.tttChannelClient.updateChannel(
      currentChannelState.channelId,
      currentChannelState.aAddress,
      currentChannelState.bAddress,
      currentChannelState.aBal,
      currentChannelState.bBal,
      appAttrs,
      currentChannelState.aOutcomeAddress,
      currentChannelState.bOutcomeAddress
    );
    if (type === 'victory') {
      this.transitionToRoute('games');
    }
  }

  private async closeChannel(): Promise<void> {
    await this.tttChannelClient.closeChannel(this.currentGame.getChannelState().channelId);
  }

  private updateBoard(player: string, Xs: number, Os: number): void {
    this.player = player;
    this.Xs = Xs;
    this.Os = Os;
  }

  private isWinningMove(marks: number): boolean {
    return (
      (marks & TOP_ROW) === TOP_ROW ||
      (marks & MID_ROW) === MID_ROW ||
      (marks & BOT_ROW) === BOT_ROW ||
      (marks & LEFT_COL) === LEFT_COL ||
      (marks & MID_COL) === MID_COL ||
      (marks & RIGHT_COL) === RIGHT_COL ||
      (marks & DH_DIAG) === DH_DIAG ||
      (marks & UH_DIAG) === UH_DIAG
    );
  }

  private isDraw(Xs: number, Os: number): boolean {
    return (Os ^ Xs) == FULL_BOARD;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    game: GameController;
  }
}
