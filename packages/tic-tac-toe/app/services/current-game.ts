import Service from '@ember/service';
import ChallengeModel from '../models/challenge';
import {tracked} from '@glimmer/tracking';

export default class CurrentGameService extends Service {
  @tracked private game!: ChallengeModel;

  public getGame(): ChallengeModel {
    return this.game;
  }

  public setGame(game: ChallengeModel): void {
    this.game = game;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'current-game': CurrentGameService;
  }
}
