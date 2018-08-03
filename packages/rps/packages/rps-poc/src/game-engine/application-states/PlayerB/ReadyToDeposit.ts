import BasePlayerB from './Base';

export default class ReadyToDeposit extends BasePlayerB {
  adjudicator: string;
  transaction;

  constructor({ channel, stake, balances, adjudicator, transaction }) {
    super({ channel, stake, balances });
    this.adjudicator = adjudicator; // address of adjudicator
    this.transaction = transaction;
  }
}
