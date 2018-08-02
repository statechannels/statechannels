import BasePlayerB from './BaseState';

export default class ReadyToSendPostFundSetupB extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator, signedPostFundSetupBMessage }) {
    super(channel, stake, balances, signedPostFundSetupBMessage);
    this.adjudicator = adjudicator;
  }
}
