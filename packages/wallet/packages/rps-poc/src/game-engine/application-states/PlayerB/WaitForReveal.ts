import BasePlayerB from './Base';
import Message from '../../Message';
import { Play } from '../../pledges';

export default class WaitForReveal extends BasePlayerB {
  message: Message;
  bPlay: Play;
  adjudicator: string;

  constructor(channel, stake, balances, adjudicator, bPlay, message) {
    super(channel, stake, balances);
    this.message = message;
    this.adjudicator = adjudicator;
    this.bPlay = bPlay;
  }
}
