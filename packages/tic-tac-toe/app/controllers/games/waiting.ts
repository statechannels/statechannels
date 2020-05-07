import Controller from '@ember/controller';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import CurrentGameService from '@statechannels/tic-tac-toe/services/current-game';
import {later} from '@ember/runloop';

export default class GamesWaitingController extends Controller {
  @service currentGame!: CurrentGameService;

  @action
  protected cancelNewGame(): void {
    console.log('Cancel New Game');
    this.currentGame.getGame().deleteRecord();

    // Firebase has issues with deleting and saving within the same run loop
    later(() => this.currentGame.getGame().save(), 1000);
    this.transitionToRoute('games');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'games/waiting': GamesWaitingController;
  }
}
