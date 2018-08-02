import BasePlayerB from './BaseState';

export default class ReadyToDeposit extends BasePlayerB {
  constructor({ channel, stake, balances, adjudicator, depositTransaction }) {
    super(channel, stake, balances);
    this.adjudicator = adjudicator; // address of adjudicator
    this.transaction = depositTransaction;
  }
}
