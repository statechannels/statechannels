import BasePlayerA from './Base';

export default class WaitForBToDeposit extends BasePlayerA {
  adjudicator: string; // address

  constructor(channel, stake, balances, adjudicator) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
  }
}
