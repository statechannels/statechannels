import Controller from '@ember/controller';
import {inject as service} from '@ember/service';
import UserService from '../services/user';
import {task, Task} from 'ember-concurrency';

export default class IndexController extends Controller {
  @service user!: UserService;

  @task(function*(this: IndexController, username: string) {
    yield this.user.initialize(username);
    console.log('Connect With MetaMask');
    this.transitionToRoute('games');
  })
  protected connectWithMetaMask!: Task<Response, () => {}>;
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    index: IndexController;
  }
}
