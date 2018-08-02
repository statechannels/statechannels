import BasePlayerA from './BaseState';

export default class WaitForPreFundSetupB extends BasePlayerA {
  constructor({ channel, stake, balances, signedPreFundSetupAMessage }) {
    super(channel, stake, balances);
    this.message = signedPreFundSetupAMessage; // in case a resend is required
  }
}
