import BasePlayerB from './Base';

export default class ReadyToSendPostFundSetupB extends BasePlayerB {
  adjudicator: string;

  constructor(channel, stake, balances, adjudicator, message) {
    super(channel, stake, balances, message);
    this.adjudicator = adjudicator;
  }
}
