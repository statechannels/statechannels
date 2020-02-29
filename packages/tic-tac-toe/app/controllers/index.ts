import Controller from '@ember/controller';
import {action} from '@ember/object';

export default class IndexController extends Controller {
  @action
  protected connectWithMetaMask(): void {
    console.log('Connect With MetaMask');
    this.transitionToRoute('games');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: IndexController;
  }
}
