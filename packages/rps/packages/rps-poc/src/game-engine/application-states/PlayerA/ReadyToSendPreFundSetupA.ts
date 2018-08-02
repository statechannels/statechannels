import BasePlayerA from './BaseState';

export default class ReadyToSendPreFundSetupA extends BasePlayerA {
  constructor({ channel, stake, balances, signedPreFundSetupAMessage }) {
    super(channel, stake, balances);
    this.message = signedPreFundSetupAMessage;
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
