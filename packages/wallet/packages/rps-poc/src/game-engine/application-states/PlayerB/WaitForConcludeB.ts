import BasePlayerB from './Base';
import Message from '../../Message';

export default class WaitForConcludeB extends BasePlayerB {
  message: Message;
  adjudicator: string;

  constructor(channel, balances, adjudicator, message) {
    const stake = 0;
    super(channel, balances, stake);
    this.message = message;
    this.adjudicator = adjudicator;
  }
}
