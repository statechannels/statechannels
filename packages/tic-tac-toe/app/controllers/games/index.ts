import Controller from '@ember/controller';
import {tracked} from '@glimmer/tracking';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import DS from 'ember-data';
import UserService from '@statechannels/tic-tac-toe/services/user';
import CurrentGameService, {Player} from '@statechannels/tic-tac-toe/services/current-game';
import ChallengeModel from '@statechannels/tic-tac-toe/models/challenge';
import makeBlockie from 'ethereum-blockies-base64';

const {parseEther} = ethers.utils;

export default class GamesIndexController extends Controller {
  @service store!: DS.Store;
  @service user!: UserService;
  @service currentGame!: CurrentGameService;

  @tracked buyInAmount = 0.001;
  @tracked showCreateGameModal = false;

  get blockieSrc(): string {
    return makeBlockie(this.user.outcomeAddress ?? '0');
  }

  get publicGames(): ChallengeModel[] {
    return this.model.filterBy('isPublic', true);
  }

  @action
  protected async createNewGame(event: Event): Promise<void> {
    event.preventDefault();
    console.log('Create New Game');
    this.showCreateGameModal = false;

    const myPublicOpenGame = {
      address: this.user.address,
      outcomeAddress: this.user.outcomeAddress,
      name: this.user.username,
      stake: parseEther(this.buyInAmount.toString()).toString(),
      createdAt: new Date().getTime(),
      isPublic: true,
      playerAName: 'unknown',
      playerAOutcomeAddress: 'unknown'
    } as ChallengeModel;

    const newGame = this.store.createRecord('challenge', myPublicOpenGame);
    await newGame.save();

    this.currentGame.setGame(newGame);
    this.currentGame.setPlayer(Player.B);

    this.transitionToRoute('games.waiting');
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  interface Registry {
    'games/index': GamesIndexController;
  }
}
