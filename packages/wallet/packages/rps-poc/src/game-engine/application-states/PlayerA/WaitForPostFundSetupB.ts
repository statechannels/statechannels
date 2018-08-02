import BasePlayerA from './BaseState';

export default class WaitForPostFundSetupB extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetupAMessage }) {
    super(channel, stake, balances, signedPostFundSetupAMessage);
    this.adjudicator = adjudicator;
  }
}
