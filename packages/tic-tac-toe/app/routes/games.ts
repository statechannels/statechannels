import Route from '@ember/routing/route';
import Transition from '@ember/routing/-private/transition';
import {inject as service} from '@ember/service';
import DS from 'ember-data';
import UserService from '../services/user';
import {subscribe, unsubscribe} from 'emberfire/services/realtime-listener';
import MessageModel from '../models/message';

export default class GamesRoute extends Route {
  @service store!: DS.Store;
  @service user!: UserService;

  beforeModel(transition: Transition): void {
    super.beforeModel(transition);
    if (!this.user.isInitialized) {
      this.transitionTo('index');
    }
  }

  model(): DS.PromiseArray<MessageModel> {
    // Using query instead of findAll as findAll duplicates games
    return this.store.query('message', {});
  }

  afterModel(model: DS.Model, transition: Transition): unknown {
    subscribe(this, model);
    return super.afterModel(model, transition);
  }

  deactivate(): void {
    unsubscribe(this);
    return super.deactivate();
  }
}
