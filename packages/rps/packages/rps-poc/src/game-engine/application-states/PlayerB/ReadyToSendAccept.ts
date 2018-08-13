import BasePlayerB from './Base';
import Move from '../../Move';
import { Play } from '../../positions';

export default class ReadyToSendAccept extends BasePlayerB {
  move: Move;
  adjudicator: string;
  bPlay: Play;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, adjudicator, bPlay, move }) {
    super({ channel, stake, balances });
    this.move = move;
    this.adjudicator = adjudicator;
    this.bPlay = bPlay;
  }
}
