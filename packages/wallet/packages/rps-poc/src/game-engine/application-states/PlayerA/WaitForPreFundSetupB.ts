import BasePlayerA from './Base';
import Message from '../../Message';

export default class WaitForPreFundSetupB extends BasePlayerA {
  message: Message;

  constructor(channel, stake, balances, message) {
    super(channel, stake, balances);
    this.message = message; // in case a resend is required
  }
}
