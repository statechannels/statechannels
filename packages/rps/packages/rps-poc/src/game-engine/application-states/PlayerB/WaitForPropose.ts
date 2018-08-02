import BasePlayerB from './BaseState';

export default class WaitForPropose extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetupBMessage }) {
    super(channel, stake, balances, signedPostFundSetupBMessage);
    this.adjudicator = adjudicator;
  }
}
