import BasePlayerA from './Base';

export default class InsufficientFundsA extends BasePlayerA {
  adjudicator: any;
  readonly isReadyToSend = false;

  constructor({ channel, balances, adjudicator }) {
    super({ channel, balances, stake: 0 });
    this.adjudicator = adjudicator;
  }
}
