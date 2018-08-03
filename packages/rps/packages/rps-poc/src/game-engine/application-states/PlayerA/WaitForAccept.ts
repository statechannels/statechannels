import BasePlayerA from './Base';
import Message from '../../Message';
import { Play } from '../../pledges';

export default class WaitForAccept extends BasePlayerA {
  message: Message;
  aPlay: Play;
  salt: string;
  adjudicator: string;

  constructor({ channel, stake, balances, adjudicator, aPlay, salt, message }) {
    super({ channel, stake, balances });
    this.message = message;
    this.aPlay = aPlay;
    this.salt = salt;
    this.adjudicator = adjudicator;
  }
}
