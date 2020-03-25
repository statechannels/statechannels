import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';
import DS from 'ember-data';
import ChallengeModel from '../../models/challenge';
import {subscribe, unsubscribe} from 'emberfire/services/realtime-listener';
import Transition from '@ember/routing/-private/transition';

export default class GamesIndexRoute extends Route {
  @service store!: DS.Store;

  model(): DS.PromiseArray<ChallengeModel> {
    // Using query instead of findAll as findAll duplicates games
    return this.store.query('challenge', {});
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
