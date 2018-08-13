import BasePlayerA from './Base';
import { Play } from '../../positions';
import Move from '../../Move';

export default class ReadyToSendPropose extends BasePlayerA {
  aPlay: Play;
  salt: string;
  adjudicator;
  move: Move;
  readonly isReadyToSend = true;

  constructor({ channel, stake, balances, adjudicator, aPlay, salt, move }) {
    super({ channel, stake, balances });
    this.aPlay = aPlay;
    this.salt = salt;
    this.move = move;
    this.adjudicator = adjudicator;
  }

  get shouldSendMove() {
    return true;
  }
}
