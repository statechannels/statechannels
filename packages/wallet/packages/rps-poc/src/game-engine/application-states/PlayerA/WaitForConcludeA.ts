import BasePlayerA from './Base';
import Move from '../../Move';

export default class WaitForConcludeA extends BasePlayerA {
  adjudicator: any;
  move: Move;
  readonly isReadyToSend = false;

  constructor({ channel, balances, adjudicator, move }) {
    super({ channel, balances, stake: 0 });
    this.adjudicator = adjudicator;
    this.move = move;
  }
}
