import Controller from '@ember/controller';
import {action} from '@ember/object';
import {task, timeout, Task} from 'ember-concurrency';

export default class GamesWaitingController extends Controller {
  @action
  protected cancelNewGame(): void {
    console.log('Cancel New Game');
    this.transitionToRoute('games');
  }

  @task(function*(this: GamesWaitingController) {
    yield timeout(2000);
    console.log('Assume that the game was accepted');
    this.transitionToRoute('game');
  })
  protected goToGame!: Task<void, () => {}>;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'games/waiting': GamesWaitingController;
  }
}
