import BasePlayerA from './BaseState';

export default class WaitForBToDeposit extends BasePlayerA {
  constructor({ channel, stake, balances, adjudicator }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator;
  }
}
