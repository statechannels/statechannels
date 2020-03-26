import Component from '@glimmer/component';
import makeBlockie from 'ethereum-blockies-base64';

interface GameCardComponentArgs {
  game: {address: string};
}

export default class GameCardComponent extends Component<GameCardComponentArgs> {
  get blockieSrc(): string {
    return makeBlockie(this.args.game.address ?? '0');
  }
}
