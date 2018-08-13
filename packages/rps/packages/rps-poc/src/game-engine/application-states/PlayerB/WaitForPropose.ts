import BasePlayerB from './Base';
import Move from '../../Move';

export default class WaitForPropose extends BasePlayerB {
  move: Move;
  adjudicator: string;

  constructor({ channel, stake, balances, adjudicator, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.adjudicator = adjudicator;
  }
}
