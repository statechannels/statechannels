import BasePlayerA from './Base';
import Message from '../../Message';

export default class WaitForConcludeA extends BasePlayerA {
  adjudicator: any;
  message: Message;

  constructor({ channel, balances, adjudicator, message }) {
    const stake = 0;
    super({ channel, balances, stake });
    this.adjudicator = adjudicator;
    this.message = message;
  }
}
