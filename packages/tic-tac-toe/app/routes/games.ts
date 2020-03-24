import Route from '@ember/routing/route';
import Transition from '@ember/routing/-private/transition';
import {inject as service} from '@ember/service';
import UserService from '../services/user';

export default class GamesRoute extends Route {
  @service user!: UserService;

  beforeModel(transition: Transition): void {
    super.beforeModel(transition);
    if (!this.user.isInitialized) {
      this.transitionTo('index');
    }
  }
}
