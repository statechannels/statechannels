import Service from '@ember/service';
import ChallengeModel from '../models/challenge';
import {tracked} from '@glimmer/tracking';

export enum Player {
  A,
  B
}

export default class CurrentGameService extends Service {
  @tracked private game!: ChallengeModel;
  @tracked private player!: Player;

  public getGame(): ChallengeModel {
    return this.game;
  }

  public setGame(game: ChallengeModel): void {
    this.game = game;
  }

  public getPlayer(): Player {
    return this.player;
  }

  public setPlayer(player: Player): void {
    this.player = player;
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    'current-game': CurrentGameService;
  }
}
