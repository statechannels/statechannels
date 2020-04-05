import Route from '@ember/routing/route';
import ChallengeModel from '../../models/challenge';
import {inject as service} from '@ember/service';
import CurrentGameService from '@statechannels/tic-tac-toe/services/current-game';

export default class GamesWaitingRoute extends Route {
  @service currentGame!: CurrentGameService;

  model(): ChallengeModel {
    return this.currentGame.getGame();
  }
}
