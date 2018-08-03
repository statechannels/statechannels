import BasePlayerB from './Base';
import Message from '../../Message';

export default class WaitForPropose extends BasePlayerB {
  message: Message;
  adjudicator: string;

  constructor(channel, stake, balances, adjudicator, message) {
    super(channel, stake, balances);
    this.message = message;
    this.adjudicator = adjudicator;
  }
}
