import BasePlayerA from './BaseState';

export default class ReadyToSendPreFundSetupA extends BasePlayerA {
  constructor({ channel, stake, balances, signedPreFundSetup0Message }) {
    super(channel, stake, balances);
    this.message = signedPreFundSetup0Message;
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
