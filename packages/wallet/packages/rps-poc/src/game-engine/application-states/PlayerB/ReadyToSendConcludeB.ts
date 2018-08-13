import BasePlayerB from './Base';
import Move from '../../Move';

export default class ReadyToSendConcludeB extends BasePlayerB {
  move: Move;
  adjudicator: string;

  constructor({ channel, balances, adjudicator, move }) {
    const stake = 0;
    super({ channel, balances, stake });
    this.move = move;
    this.adjudicator = adjudicator;
  }
}
