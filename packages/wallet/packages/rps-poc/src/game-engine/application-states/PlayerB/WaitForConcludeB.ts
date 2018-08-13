import BasePlayerB from './Base';
import Move from '../../Move';

export default class WaitForConcludeB extends BasePlayerB {
  move: Move;
  adjudicator: string;
  readonly isReadyToSend = false;

  constructor({ channel, balances, adjudicator, move }) {
    super({ channel, balances, stake: 0 });
    this.move = move;
    this.adjudicator = adjudicator;
  }
}
