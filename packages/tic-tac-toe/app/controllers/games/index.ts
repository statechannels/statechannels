import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';

export default class GamesIndexController extends Controller {
  @tracked buyInAmount = 0.1;
  @tracked showCreateGameModal = false;

  @action
  protected createNewGame(event: Event): void {
    event.preventDefault();
    console.log('Create New Game');
    this.showCreateGameModal = false;
    this.transitionToRoute('games.waiting');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'games/index': GamesIndexController;
  }
}
