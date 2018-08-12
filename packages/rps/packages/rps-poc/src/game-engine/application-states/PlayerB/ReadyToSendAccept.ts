import BasePlayerB from './Base';
import Message from '../../Message';
import { Play } from '../../positions';

export default class ReadyToSendAccept extends BasePlayerB {
  message: Message;
  adjudicator: string;
  bPlay: Play;

  constructor({ channel, stake, balances, adjudicator, bPlay, message }) {
    super({ channel, stake, balances });
    this.message = message;
    this.adjudicator = adjudicator;
    this.bPlay = bPlay;
  }
}
