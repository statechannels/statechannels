import BasePlayerB from './Base';
import Message from '../../Message';

export default class ReadyToSendPreFundSetupB extends BasePlayerB {
  message: Message;

  constructor({ channel, stake, balances, message }) {
    super({ channel, stake, balances });
    this.message = message;
  }
}
