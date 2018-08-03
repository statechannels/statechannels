import BasePlayerA from './Base';
import Message from '../../Message';

export default class WaitForPostFundSetupB extends BasePlayerA {
  adjudicator: string; // address
  message: Message;

  constructor(channel, stake, balances, adjudicator, message) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.message = message;
  }
}
