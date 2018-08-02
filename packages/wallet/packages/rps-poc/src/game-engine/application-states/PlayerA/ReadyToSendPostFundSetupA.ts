import BasePlayerA from './BaseState';

export default class ReadyToSendPostFundSetupA extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetupAMessage }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
    this.message = signedPostFundSetupAMessage;
  }

  get shouldSendMessage() {
    return true;
  }
}
