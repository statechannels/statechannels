import BasePlayerA from './Base';
import Move from '../../Move';

export default class WaitForPostFundSetupB extends BasePlayerA {
  adjudicator: string; // address
  move: Move;

  constructor({ channel, stake, balances, adjudicator, move }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator;
    this.move = move;
  }
}
