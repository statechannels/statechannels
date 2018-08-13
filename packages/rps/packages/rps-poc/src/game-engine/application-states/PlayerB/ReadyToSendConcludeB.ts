import BasePlayerB from './Base';
import Move from '../../Move';

export default class ReadyToSendConcludeB extends BasePlayerB {
  move: Move;
  adjudicator: string;
  readonly isReadyToSend = true;

  constructor({ channel, balances, adjudicator, move }) {
    super({ channel, balances, stake: 0 });
    this.move = move;
    this.adjudicator = adjudicator;
  }
}
