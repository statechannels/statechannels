import BasePlayerA from './Base';
import { Play } from '../../pledges';
import Message from '../../Message';

export default class ReadyToSendPropose extends BasePlayerA {
  aPlay: Play;
  salt: string;
  adjudicator;
  message: Message;

  constructor({ channel, stake, balances, adjudicator, aPlay, salt, message }) {
    super({ channel, stake, balances });
    this.aPlay = aPlay;
    this.salt = salt;
    this.message = message;
    this.adjudicator = adjudicator;
  }

  get shouldSendMessage() {
    return true;
  }
}
