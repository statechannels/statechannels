import BasePlayerB from './Base';
import Move from '../../Move';
import { Play } from '../../positions';

export default class WaitForReveal extends BasePlayerB {
  move: Move;
  bPlay: Play;
  adjudicator: string;
  readonly isReadyToSend = false;

  constructor({ channel, stake, balances, adjudicator, bPlay, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.adjudicator = adjudicator;
    this.bPlay = bPlay;
  }
}
