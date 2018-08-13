import BasePlayerA from './Base';
import Move from '../../Move';

export default class WaitForConcludeA extends BasePlayerA {
  adjudicator: any;
  move: Move;

  constructor({ channel, balances, adjudicator, move }) {
    const stake = 0;
    super({ channel, balances, stake });
    this.adjudicator = adjudicator;
    this.move = move;
  }
}
