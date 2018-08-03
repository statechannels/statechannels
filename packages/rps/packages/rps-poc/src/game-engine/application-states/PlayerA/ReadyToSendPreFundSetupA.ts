import BasePlayerA from './Base';
import Message from '../../Message';

export default class ReadyToSendPreFundSetupA extends BasePlayerA {
  message: Message;

  constructor(channel, stake: number, balances, message: Message) {
    super(channel, stake, balances);
    this.message = message;
  }

  toJSON() {
    return {
      ...this.commonAttributes,
      message: this.message,
    };
  }

  get shouldSendMessage() {
    return true;
  }
}
