import Route from '@ember/routing/route';
import {inject as service} from '@ember/service';
import DS from 'ember-data';
import ChallengeModel from '../../models/challenge';

export default class GamesIndexRoute extends Route {
  @service store!: DS.Store;

  model(): DS.PromiseArray<ChallengeModel> {
    return this.store.findAll('challenge');
  }
}
