import Route from '@ember/routing/route';
import ChallengeModel from '../../models/challenge';
import {inject as service} from '@ember/service';
import DS from 'ember-data';
import CurrentGameService from '@statechannels/tic-tac-toe/services/current-game';
import {subscribe, unsubscribe} from 'emberfire/services/realtime-listener';
import Transition from '@ember/routing/-private/transition';

export default class GamesWaitingRoute extends Route {
  @service currentGame!: CurrentGameService;

  model(): ChallengeModel {
    return this.currentGame.getGame();
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
