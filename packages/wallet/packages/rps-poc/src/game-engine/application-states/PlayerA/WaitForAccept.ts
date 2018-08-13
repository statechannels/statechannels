import BasePlayerA from './Base';
import Move from '../../Move';
import { Play } from '../../positions';

export default class WaitForAccept extends BasePlayerA {
  move: Move;
  aPlay: Play;
  salt: string;
  adjudicator: string;

  constructor({ channel, stake, balances, adjudicator, aPlay, salt, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.aPlay = aPlay;
    this.salt = salt;
    this.adjudicator = adjudicator;
  }
}
